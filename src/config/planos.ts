// src/config/planos.ts

export type PlanoId = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type BillingCycle = "MONTHLY" | "YEARLY";

export const ANNUAL_DISCOUNT = 0.10;

export type PlanoConfig = {
  id: PlanoId;
  nome: string;
  descricao: string;
  preco: number;              // valor mensal em R$
  maxFuncionarios: number;    // limite de funcionários (cargo FUNCIONARIO)
  maxAdmins: number;          // limite de admins (ADMIN/DONO)
  maxFiliais: number;         // limite de filiais (0 = só matriz)
  extraFuncionario: number;   // valor por funcionário excedente
  extraAdmin: number;         // valor por admin excedente
  extraFilial: number;        // valor por filial excedente
  reconhecimentoFacial: boolean;
  relatoriosPdf: "BASICO" | "COMPLETO";
  suporte: "EMAIL" | "WHATSAPP_EMAIL" | "PRIORITARIO";
};

export const PLANOS: Record<PlanoId, PlanoConfig> = {
  STARTER: {
    id: "STARTER",
    nome: "Starter",
    descricao: "Ideal para pequenas empresas",
    preco: 69.9,
    maxFuncionarios: 10,
    maxAdmins: 1,
    maxFiliais: 0,       // só a matriz (sede)
    extraFuncionario: 7.9,
    extraAdmin: 49.9,
    extraFilial: 49.9,
    reconhecimentoFacial: false,
    relatoriosPdf: "BASICO",
    suporte: "EMAIL",
  },
  PROFESSIONAL: {
    id: "PROFESSIONAL",
    nome: "Professional",
    descricao: "Para empresas em crescimento",
    preco: 99.9,
    maxFuncionarios: 20,
    maxAdmins: 2,
    maxFiliais: 2,       // matriz + 2 filiais
    extraFuncionario: 6.9,
    extraAdmin: 39.9,
    extraFilial: 39.9,
    reconhecimentoFacial: true,
    relatoriosPdf: "COMPLETO",
    suporte: "WHATSAPP_EMAIL",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    nome: "Enterprise",
    descricao: "Para grandes operações",
    preco: 199.9,
    maxFuncionarios: 80,
    maxAdmins: 5,
    maxFiliais: -1,      // ilimitado
    extraFuncionario: 4.9,
    extraAdmin: 29.9,
    extraFilial: 0,
    reconhecimentoFacial: true,
    relatoriosPdf: "COMPLETO",
    suporte: "PRIORITARIO",
  },
};

export const PLANO_DEFAULT: PlanoId = "PROFESSIONAL";

export function getPlanoConfig(plano?: string | null): PlanoConfig {
  const id = (plano ?? PLANO_DEFAULT) as PlanoId;
  return PLANOS[id] ?? PLANOS[PLANO_DEFAULT];
}

/**
 * Calcula o valor da assinatura com base no plano, quantidades atuais e ciclo.
 */
export function calcularValorAssinatura(
  plano: PlanoConfig,
  totalFuncionarios: number,
  totalAdmins: number,
  totalFiliais: number = 0,
  cycle: BillingCycle = "MONTHLY"
): {
  valorBase: number;
  extraFunc: number;
  extraAdm: number;
  extraFil: number;
  totalMensal: number;
  desconto: number;
  cycle: BillingCycle;
  total: number;
} {
  const extraFunc = Math.max(0, totalFuncionarios - plano.maxFuncionarios);
  const extraAdm = Math.max(0, totalAdmins - plano.maxAdmins);
  const extraFil =
    plano.maxFiliais < 0 ? 0 : Math.max(0, totalFiliais - plano.maxFiliais);

  const valorExtraFunc = extraFunc * plano.extraFuncionario;
  const valorExtraAdm = extraAdm * plano.extraAdmin;
  const valorExtraFil = extraFil * plano.extraFilial;
  const totalMensal = Number(
    (plano.preco + valorExtraFunc + valorExtraAdm + valorExtraFil).toFixed(2)
  );

  let total: number;
  let desconto = 0;

  if (cycle === "YEARLY") {
    const anualSemDesconto = totalMensal * 12;
    desconto = Number((anualSemDesconto * ANNUAL_DISCOUNT).toFixed(2));
    total = Number((anualSemDesconto - desconto).toFixed(2));
  } else {
    total = totalMensal;
  }

  return {
    valorBase: plano.preco,
    extraFunc: valorExtraFunc,
    extraAdm: valorExtraAdm,
    extraFil: valorExtraFil,
    totalMensal,
    desconto,
    cycle,
    total,
  };
}

/**
 * Calcula o preço anual de um plano (sem excedentes) para exibição na UI.
 */
export function getPrecoAnual(plano: PlanoConfig): {
  mensal: number;
  anual: number;
  mensalEquivalente: number;
  economia: number;
} {
  const anualSemDesconto = plano.preco * 12;
  const anual = Number((anualSemDesconto * (1 - ANNUAL_DISCOUNT)).toFixed(2));
  const mensalEquivalente = Number((anual / 12).toFixed(2));
  const economia = Number((anualSemDesconto - anual).toFixed(2));

  return {
    mensal: plano.preco,
    anual,
    mensalEquivalente,
    economia,
  };
}
