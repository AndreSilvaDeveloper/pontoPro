import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== "SUPER_ADMIN") {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ erro: "ID da empresa é obrigatório." }, { status: 400 });
    }

    await prisma.$transaction(
      async (tx) => {
        const step = async (label: string, fn: () => Promise<any>) => {
          try {
            // console.log(`[EXCLUIR EMPRESA] -> ${label}`);
            return await fn();
          } catch (e) {
            console.error(`[EXCLUIR EMPRESA] FALHOU EM: ${label}`, e);
            throw e;
          }
        };

        // 0) Descobre raiz
        const empresa = await step("buscar empresa", () =>
          tx.empresa.findUnique({
            where: { id },
            select: { id: true, matrizId: true },
          })
        );

        if (!empresa) throw new Error("Empresa não encontrada.");

        const raizId = empresa.matrizId ?? empresa.id;

        const filiais = await step("buscar filiais", () =>
          tx.empresa.findMany({
            where: { matrizId: raizId },
            select: { id: true },
          })
        );

        const filialIds = filiais.map((f: any) => f.id);
        const empresaIds = [raizId, ...filialIds];

        // 1) Usuários
        const usuariosDaEmpresa = await step("buscar usuários", () =>
          tx.usuario.findMany({
            where: { empresaId: { in: empresaIds } },
            select: { id: true, cargo: true },
          })
        );

        const idsSuperAdmins = usuariosDaEmpresa.filter((u: any) => u.cargo === "SUPER_ADMIN").map((u: any) => u.id);
        const idsParaExcluir = usuariosDaEmpresa.filter((u: any) => u.cargo !== "SUPER_ADMIN").map((u: any) => u.id);

        // 2) SUPER_ADMINs
        if (idsSuperAdmins.length > 0) {
          await step("adminLoja deleteMany (super_admins)", () =>
            tx.adminLoja.deleteMany({
              where: { empresaId: { in: empresaIds }, usuarioId: { in: idsSuperAdmins } },
            })
          );

          await step("usuario updateMany (desvincular super_admins)", () =>
            tx.usuario.updateMany({
              where: { id: { in: idsSuperAdmins } },
              data: { empresaId: null },
            })
          );
        }

        // 3) Dados dos usuários (não superadmin)
        if (idsParaExcluir.length > 0) {
          await step("ponto deleteMany", () => tx.ponto.deleteMany({ where: { usuarioId: { in: idsParaExcluir } } }));
          await step("solicitacaoAjuste deleteMany", () =>
            tx.solicitacaoAjuste.deleteMany({ where: { usuarioId: { in: idsParaExcluir } } })
          );
          await step("ausencia deleteMany", () =>
            tx.ausencia.deleteMany({ where: { usuarioId: { in: idsParaExcluir } } })
          );

          await step("adminLoja deleteMany (usuarios)", () =>
            tx.adminLoja.deleteMany({ where: { usuarioId: { in: idsParaExcluir } } })
          );

          await step("usuario deleteMany", () => tx.usuario.deleteMany({ where: { id: { in: idsParaExcluir } } }));
        }

        // 4) Segurança extra
        await step("adminLoja deleteMany (empresas)", () =>
          tx.adminLoja.deleteMany({ where: { empresaId: { in: empresaIds } } })
        );

        // 5) Dados gerais
        await step("feriado deleteMany", () => tx.feriado.deleteMany({ where: { empresaId: { in: empresaIds } } }));

        // ⚠️ logAuditoria pode ter algo impedindo (FK, trigger, RLS, etc.)
        await step("logAuditoria deleteMany", () =>
          tx.logAuditoria.deleteMany({ where: { empresaId: { in: empresaIds } } })
        );

        // 6) Apaga filiais primeiro
        if (filialIds.length > 0) {
          await step("empresa deleteMany (filiais)", () => tx.empresa.deleteMany({ where: { id: { in: filialIds } } }));
        }

        // 7) Apaga raiz
        await step("empresa delete (raiz)", () => tx.empresa.delete({ where: { id: raizId } }));
      },
      {
        maxWait: 10000, // 10s para conseguir abrir a transação
        timeout: 60000, // 60s para deletar tudo sem fechar no meio
      }
    );

    return NextResponse.json({
      success: true,
      message: "Empresa excluída (matriz + filiais + limpeza total) com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir empresa:", error);
    return NextResponse.json(
      { erro: "Erro técnico ao excluir. Verifique dependências/tabelas relacionadas." },
      { status: 500 }
    );
  }
}
