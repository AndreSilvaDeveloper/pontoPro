// src/config/planos.ts

export type PlanoId = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

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
    maxFuncionarios: 30,
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
 * Calcula o valor da assinatura com base no plano e quantidades atuais.
 */
export function calcularValorAssinatura(
  plano: PlanoConfig,
  totalFuncionarios: number,
  totalAdmins: number,
  totalFiliais: number = 0
): { valorBase: number; extraFunc: number; extraAdm: number; extraFil: number; total: number } {
  const extraFunc = Math.max(0, totalFuncionarios - plano.maxFuncionarios);
  const extraAdm = Math.max(0, totalAdmins - plano.maxAdmins);
  const extraFil =
    plano.maxFiliais < 0 ? 0 : Math.max(0, totalFiliais - plano.maxFiliais);

  const valorExtraFunc = extraFunc * plano.extraFuncionario;
  const valorExtraAdm = extraAdm * plano.extraAdmin;
  const valorExtraFil = extraFil * plano.extraFilial;
  const total = Number(
    (plano.preco + valorExtraFunc + valorExtraAdm + valorExtraFil).toFixed(2)
  );

  return {
    valorBase: plano.preco,
    extraFunc: valorExtraFunc,
    extraAdm: valorExtraAdm,
    extraFil: valorExtraFil,
    total,
  };
}
