// src/lib/saas-financeiro.ts — Cálculos financeiros para o painel SaaS
import { getPlanoConfig, type PlanoConfig } from "@/config/planos";

export type FinanceiroResult = {
  totalVidas: number;
  totalAdmins: number;
  totalFiliais: number;
  vidasExcedentes: number;
  adminsExcedentes: number;
  custoVidas: number;
  custoAdmins: number;
  valorBase: number;
  valorFinal: number;
  planoNome: string;
};

export function calcularFinanceiro(matriz: any): FinanceiroResult {
  const plano: PlanoConfig = getPlanoConfig(matriz.plano);

  let totalVidas = matriz._count?.usuarios || 0;
  const adminsUnicos = new Set<string>();
  const ehAdmin = (u: any) => ["ADMIN", "SUPER_ADMIN", "DONO"].includes(u.cargo);

  if (matriz.usuarios) {
    matriz.usuarios.forEach((u: any) => {
      if (ehAdmin(u)) adminsUnicos.add(u.id);
    });
  }

  const totalFiliais = matriz.filiais?.length || 0;

  if (matriz.filiais && matriz.filiais.length > 0) {
    matriz.filiais.forEach((f: any) => {
      totalVidas += f._count?.usuarios || 0;
      if (f.usuarios) {
        f.usuarios.forEach((u: any) => {
          if (ehAdmin(u)) adminsUnicos.add(u.id);
        });
      }
    });
  }

  const totalAdmins = adminsUnicos.size;

  const vidasExcedentes = Math.max(0, totalVidas - plano.maxFuncionarios);
  const adminsExcedentes = Math.max(0, totalAdmins - plano.maxAdmins);

  const custoVidas = vidasExcedentes * plano.extraFuncionario;
  const custoAdmins = adminsExcedentes * plano.extraAdmin;
  const valorFinal = Number((plano.preco + custoVidas + custoAdmins).toFixed(2));

  return {
    totalVidas,
    totalAdmins,
    totalFiliais,
    vidasExcedentes,
    adminsExcedentes,
    custoVidas,
    custoAdmins,
    valorBase: plano.preco,
    valorFinal,
    planoNome: plano.nome,
  };
}
