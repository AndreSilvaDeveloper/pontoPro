import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  return session?.user?.cargo === "SUPER_ADMIN";
}

// LISTAR TODAS AS EMPRESAS (HIERARQUIA MATRIZ > FILIAIS)
export async function POST() {
  if (!(await isSuperAdmin())) return NextResponse.json({ erro: "403" }, { status: 403 });

  try {
    const empresas = await prisma.empresa.findMany({
      where: { matrizId: null },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        status: true,
        matrizId: true,
        criadoEm: true,

        // ✅ financeiro/billing (usado no painel e no bloqueio)
        cobrancaAtiva: true,
        trialAte: true,
        pagoAte: true,
        dataUltimoPagamento: true,
        diaVencimento: true,
        billingAnchorAt: true,
        chavePix: true,
        cobrancaWhatsapp: true,

        _count: { select: { usuarios: true } },

        usuarios: {
          where: { cargo: { in: ["ADMIN", "SUPER_ADMIN"] } },
          select: { id: true, nome: true, email: true, cargo: true },
          orderBy: { nome: "asc" },
        },

        filiais: {
          orderBy: { criadoEm: "desc" },
          select: {
            id: true,
            nome: true,
            cnpj: true,
            status: true,
            matrizId: true,
            criadoEm: true,

            cobrancaAtiva: true,
            trialAte: true,
            pagoAte: true,
            dataUltimoPagamento: true,
            diaVencimento: true,
            billingAnchorAt: true,
            chavePix: true,
            cobrancaWhatsapp: true,

            _count: { select: { usuarios: true } },
            usuarios: {
              where: { cargo: { in: ["ADMIN", "SUPER_ADMIN"] } },
              select: { id: true, nome: true, email: true, cargo: true },
              orderBy: { nome: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json(empresas);
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    return NextResponse.json({ erro: "Erro ao buscar" }, { status: 500 });
  }
}

// BLOQUEAR / DESBLOQUEAR / CONFIGURAR
export async function PUT(request: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ erro: "403" }, { status: 403 });

  try {
    const { empresaId, acao, novasConfigs, matrizId } = await request.json();

    if (acao === "ALTERAR_STATUS") {
      const emp = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { status: true } });
      const novoStatus = emp?.status === "ATIVO" ? "BLOQUEADO" : "ATIVO";

      await prisma.empresa.update({
        where: { id: empresaId },
        data: { status: novoStatus },
      });

      return NextResponse.json({ success: true, novoStatus });
    }

    if (acao === "FORCAR_CONFIG") {
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { configuracoes: novasConfigs },
      });
      return NextResponse.json({ success: true });
    }

    if (acao === "VINCULAR_MATRIZ") {
      if (empresaId === matrizId) {
        return NextResponse.json({ erro: "Uma empresa não pode ser matriz dela mesma." }, { status: 400 });
      }

      await prisma.empresa.update({
        where: { id: empresaId },
        data: { matrizId: matrizId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ erro: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: "Erro ao atualizar" }, { status: 500 });
  }
}
