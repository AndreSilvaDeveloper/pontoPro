// src/lib/saas-financeiro.ts — Cálculos financeiros para o painel SaaS
import {
  calcularCustoTotem,
  getPlanoConfig,
  temPrecoNegociadoVigente,
  type PlanoConfig,
} from "@/config/planos";

export type FinanceiroResult = {
  totalVidas: number;
  totalAdmins: number;
  totalFiliais: number;
  vidasExcedentes: number;
  adminsExcedentes: number;
  custoVidas: number;
  custoAdmins: number;
  custoTotem: number;
  totemAtivo: boolean;
  totemIncluso: boolean;
  valorBase: number;
  valorFinal: number;
  planoNome: string;
  /** True quando há preço negociado vigente — UI pode mostrar badge */
  precoNegociado: boolean;
  /** Quando há override, este é o valor de tabela "ignorado" — útil pro painel SaaS */
  valorTabelaMensal: number;
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

  const totemAtivo = matriz.addonTotem === true;
  const custoTotem = calcularCustoTotem(plano, totemAtivo, totalFiliais);

  const valorTabelaMensal = Number(
    (plano.preco + custoVidas + custoAdmins + custoTotem).toFixed(2),
  );

  const negociado = temPrecoNegociadoVigente({
    precoNegociado: matriz.precoNegociado,
    precoNegociadoExpiraEm: matriz.precoNegociadoExpiraEm,
  });

  const valorFinal = negociado
    ? Number(Number(matriz.precoNegociado).toFixed(2))
    : valorTabelaMensal;

  return {
    totalVidas,
    totalAdmins,
    totalFiliais,
    vidasExcedentes,
    adminsExcedentes,
    custoVidas,
    custoAdmins,
    custoTotem,
    totemAtivo,
    totemIncluso: plano.totemIncluso,
    valorBase: plano.preco,
    valorFinal,
    planoNome: plano.nome,
    precoNegociado: negociado,
    valorTabelaMensal,
  };
}
