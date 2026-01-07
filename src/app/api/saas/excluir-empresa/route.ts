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

    await prisma.$transaction(async (tx) => {
      // 1) Pega todos usuários da empresa
      const usuariosDaEmpresa = await tx.usuario.findMany({
        where: { empresaId: id },
        select: { id: true, cargo: true },
      });

      const idsSuperAdmins = usuariosDaEmpresa
        .filter((u) => u.cargo === "SUPER_ADMIN")
        .map((u) => u.id);

      const idsParaExcluir = usuariosDaEmpresa
        .filter((u) => u.cargo !== "SUPER_ADMIN")
        .map((u) => u.id);

      // 2) SUPER_ADMINs: mantém vivos, remove vínculo e acessos dessa empresa
      if (idsSuperAdmins.length > 0) {
        // remove acessos ao "adminLoja" dessa empresa
        await tx.adminLoja.deleteMany({
          where: { empresaId: id, usuarioId: { in: idsSuperAdmins } },
        });

        // desvincula da empresa (pra não ficar FK apontando pra empresa deletada)
        await tx.usuario.updateMany({
          where: { id: { in: idsSuperAdmins } },
          data: { empresaId: null },
        });
      }

      // 3) Apaga tudo que pertence aos usuários (exceto SUPER_ADMIN)
      if (idsParaExcluir.length > 0) {
        await tx.ponto.deleteMany({ where: { usuarioId: { in: idsParaExcluir } } });
        await tx.solicitacaoAjuste.deleteMany({ where: { usuarioId: { in: idsParaExcluir } } });
        await tx.ausencia.deleteMany({ where: { usuarioId: { in: idsParaExcluir } } });

        // remove vínculos em adminLoja desses usuários
        await tx.adminLoja.deleteMany({ where: { usuarioId: { in: idsParaExcluir } } });

        // por fim, apaga os usuários
        await tx.usuario.deleteMany({ where: { id: { in: idsParaExcluir } } });
      }

      // 4) Apaga vínculos restantes apontando pra empresa (segurança extra)
      await tx.adminLoja.deleteMany({ where: { empresaId: id } });

      // 5) Apaga dados gerais da empresa
      await tx.feriado.deleteMany({ where: { empresaId: id } });
      await tx.logAuditoria.deleteMany({ where: { empresaId: id } });

      // 6) Apaga a empresa
      await tx.empresa.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: "Empresa excluída (limpeza total) com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir empresa:", error);
    return NextResponse.json(
      { erro: "Erro técnico ao excluir. Verifique dependências/tabelas relacionadas." },
      { status: 500 }
    );
  }
}
