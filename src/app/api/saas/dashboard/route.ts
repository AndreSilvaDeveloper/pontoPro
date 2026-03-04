// src/app/api/saas/dashboard/route.ts — Stats agregados do painel Super Admin
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getPlanoConfig } from "@/config/planos";

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  return session?.user?.cargo === "SUPER_ADMIN";
}

export async function GET() {
  if (!(await isSuperAdmin()))
    return NextResponse.json({ erro: "403" }, { status: 403 });

  try {
    const now = new Date();
    const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const empresas = await prisma.empresa.findMany({
      where: { matrizId: null },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        status: true,
        plano: true,
        trialAte: true,
        pagoAte: true,
        cobrancaAtiva: true,
        billingAnchorAt: true,
        criadoEm: true,
        _count: { select: { usuarios: true } },
        filiais: {
          select: {
            _count: { select: { usuarios: true } },
          },
        },
        usuarios: {
          where: { cargo: { in: ["ADMIN", "SUPER_ADMIN"] } },
          select: { id: true, nome: true, email: true, cargo: true },
        },
      },
    });

    let totalAtivos = 0;
    let emTrial = 0;
    let inadimplentes = 0;
    let bloqueados = 0;
    let totalFuncionarios = 0;
    let mrr = 0;
    let signupsRecentes = 0;
    const empresasRecentes: any[] = [];

    for (const emp of empresas) {
      // Contar funcionários (matriz + filiais)
      let funcCount = emp._count.usuarios;
      for (const f of emp.filiais) {
        funcCount += f._count.usuarios;
      }
      totalFuncionarios += funcCount;

      // Signup recente
      if (emp.criadoEm >= seteDiasAtras) {
        signupsRecentes++;
        empresasRecentes.push({
          id: emp.id,
          nome: emp.nome,
          cnpj: emp.cnpj,
          plano: emp.plano,
          criadoEm: emp.criadoEm,
          totalUsuarios: funcCount,
          admins: emp.usuarios,
        });
      }

      const trialAtivo = emp.trialAte && new Date(emp.trialAte) > now;

      if (emp.status === "BLOQUEADO") {
        bloqueados++;
        continue;
      }

      if (trialAtivo) {
        emTrial++;
        continue;
      }

      // Para MRR: calcular valor de cada empresa ativa
      const plano = getPlanoConfig(emp.plano);
      const totalAdmins = emp.usuarios.length;
      const vidasExcedentes = Math.max(0, funcCount - plano.maxFuncionarios);
      const adminsExcedentes = Math.max(0, totalAdmins - plano.maxAdmins);
      const valorFinal = plano.preco + vidasExcedentes * plano.extraFuncionario + adminsExcedentes * plano.extraAdmin;

      // Inadimplente: ativo mas pagoAte expirou e trial expirou
      const pagoAteDate = emp.pagoAte ? new Date(emp.pagoAte) : null;
      const anchorDate = emp.billingAnchorAt ? new Date(emp.billingAnchorAt) : null;

      const estaPago = pagoAteDate && pagoAteDate >= now;
      const anchorValido = anchorDate && anchorDate >= now;

      if (!estaPago && !anchorValido && !trialAtivo && emp.status === "ATIVO") {
        inadimplentes++;
      } else if (emp.status === "ATIVO") {
        totalAtivos++;
      }

      // MRR só conta empresas ativas (não bloqueadas, não trial)
      if (emp.status === "ATIVO") {
        mrr += valorFinal;
      }
    }

    return NextResponse.json({
      totalEmpresas: empresas.length,
      totalAtivos,
      emTrial,
      inadimplentes,
      bloqueados,
      totalFuncionarios,
      mrr: Number(mrr.toFixed(2)),
      signupsRecentes,
      empresasRecentes,
    });
  } catch (error) {
    console.error("Erro ao gerar dashboard stats:", error);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
