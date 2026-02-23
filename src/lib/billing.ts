// src/lib/billing.ts

export type BillingCode =
  | "OK"
  | "TRIAL_ACTIVE"
  | "TRIAL_ENDING"
  | "TRIAL_EXPIRED"
  | "DUE_SOON"
  | "PAST_DUE"
  | "BLOCKED"
  | "MANUAL_BLOCK"
  | "PENDING_FIRST_INVOICE";

export type EmpresaBillingShape = {
  id: string;
  nome: string;
  status?: string | null;

  cobrancaAtiva?: boolean | null;

  trialAte?: Date | string | null;
  pagoAte?: Date | string | null;

  // ainda existe no banco, mas deixa de ser “fonte principal”
  diaVencimento?: number | null;

  // ✅ agora é a fonte oficial de vencimento do ciclo
  billingAnchorAt?: Date | string | null;

  dataUltimoPagamento?: Date | string | null;

  // extras
  chavePix?: string | null;
  cobrancaWhatsapp?: string | null;
};

export type BillingStatus = {
  blocked: boolean;
  bloqueado: boolean;

  showAlert: boolean;
  paidForCycle: boolean;

  code: BillingCode;
  message: string;

  dueAtISO: string | null;
  dueAt: string | null;

  // TRIAL: dias restantes (positivo)
  // BILLING: dias até vencer (positivo) OU dias atrasado (positivo)
  days: number | null;

  phase: "TRIAL" | "BILLING";
};

const MS_DAY = 24 * 60 * 60 * 1000;
/**
 * Tolerância após vencer o anchor antes de bloquear.
 * Ex.: venceu dia 01
 * - até dia 11 => libera com alerta
 * - a partir do dia 12 => bloqueia
 */
const TOLERANCE_DAYS = 10;

function toDate(v?: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * a - b em dias (arredondado por dia-calendário)
 * > 0 => a está depois de b
 * < 0 => a está antes de b
 */
function diffDays(a: Date, b: Date) {
  const aa = startOfDay(a).getTime();
  const bb = startOfDay(b).getTime();
  return Math.round((aa - bb) / MS_DAY);
}

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.max(1, Math.min(day, last));
}

function getDueDateByFixedDay(now: Date, diaVencimento: number) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = clampDayToMonth(y, m, diaVencimento);
  return new Date(y, m, d, 0, 0, 0, 0);
}

function toISOorNull(d: Date | null) {
  return d ? d.toISOString() : null;
}

function buildStatus(params: BillingStatus): BillingStatus {
  return params;
}

function buildOk(due: Date | null, message = "Assinatura em dia."): BillingStatus {
  const iso = toISOorNull(due);
  return buildStatus({
    blocked: false,
    bloqueado: false,
    showAlert: false,
    paidForCycle: true,
    code: "OK",
    message,
    dueAtISO: iso,
    dueAt: iso,
    days: null,
    phase: "BILLING",
  });
}

export function getBillingStatus(
  empresa?: Partial<EmpresaBillingShape> | null
): BillingStatus {
  if (!empresa) {
    return buildOk(null, "Sem dados de cobrança.");
  }

  const now = new Date();
  const status = empresa.status ?? "ATIVO";

  // 1) BLOQUEIO MANUAL
  if (status === "BLOQUEADO") {
    return buildStatus({
      blocked: true,
      bloqueado: true,
      showAlert: true,
      paidForCycle: false,
      code: "MANUAL_BLOCK",
      message: "Acesso bloqueado manualmente. Entre em contato para regularização.",
      dueAtISO: null,
      dueAt: null,
      days: null,
      phase: "BILLING",
    });
  }

  // 2) Cobrança desativada
  if (empresa.cobrancaAtiva === false) {
    return buildOk(null, "Cobrança desativada.");
  }

  const trialAte = toDate(empresa.trialAte);
  const anchorAt = toDate(empresa.billingAnchorAt);
  const pagoAte = toDate(empresa.pagoAte);

  // 3) TRIAL
  if (trialAte) {
    if (now <= trialAte) {
      const diasRestantes = Math.max(0, diffDays(trialAte, now));
      const code: BillingCode = diasRestantes <= 3 ? "TRIAL_ENDING" : "TRIAL_ACTIVE";

      return buildStatus({
        blocked: false,
        bloqueado: false,
        showAlert: true,
        paidForCycle: false,
        code,
        message:
          code === "TRIAL_ENDING"
            ? "Seu período de teste está acabando."
            : "Período de teste ativo.",
        // aqui faz sentido mostrar quando acaba o trial
        dueAtISO: trialAte.toISOString(),
        dueAt: trialAte.toISOString(),
        days: diasRestantes,
        phase: "TRIAL",
      });
    }

    // Trial expirou, mas existe anchor para 1ª fatura ainda no futuro:
    // ✅ LIBERA até o anchor vencer
    if (anchorAt && now <= anchorAt) {
      const diasAteVencer = Math.max(0, diffDays(anchorAt, now));
      return buildStatus({
        blocked: false,
        bloqueado: false,
        showAlert: true,
        paidForCycle: false,
        code: "PENDING_FIRST_INVOICE",
        message:
          diasAteVencer === 0
            ? "Seu período de teste acabou e sua 1ª fatura vence hoje."
            : `Seu período de teste acabou. Sua fatura vence em ${diasAteVencer} dias.`,
        dueAtISO: anchorAt.toISOString(),
        dueAt: anchorAt.toISOString(),
        days: diasAteVencer,
        phase: "BILLING",
      });
    }

    // Trial expirou e não há anchor: cai na regra de billing (abaixo),
    // que pode bloquear dependendo do vencimento calculado.
  }

  // 4) VENCIMENTO OFICIAL DO CICLO (prioridade: anchor)
  // Se não houver anchor (dados antigos), cai no vencimento fixo por dia do mês.
  let dueAt: Date | null = null;

  if (anchorAt) {
    dueAt = anchorAt;
  } else {
    const dia = Number.isFinite(empresa.diaVencimento as any) ? Number(empresa.diaVencimento) : 15;
    dueAt = getDueDateByFixedDay(now, dia);

    // se o vencimento fixo desse mês já passou, usa o do mês seguinte
    if (diffDays(now, dueAt) > 0) {
      dueAt.setMonth(dueAt.getMonth() + 1);
    }
  }

  // 5) Se pagoAte existir e ainda está válido => em dia
  // (mantemos o dueAt como o anchor do próximo vencimento)
  if (pagoAte && now <= pagoAte) {
    return buildOk(dueAt, "Assinatura em dia.");
  }

  // 6) Sem dueAt => sem como avaliar
  if (!dueAt) {
    return buildOk(null, "Sem vencimento configurado.");
  }

  // 7) Billing normal baseado no vencimento oficial (anchor/fallback)
  const diasAposVenc = diffDays(now, dueAt);

  // agora > dueAt => atrasado
  if (diasAposVenc > 0) {
    const diasAtrasado = diasAposVenc;

    if (diasAtrasado > TOLERANCE_DAYS) {
      return buildStatus({
        blocked: true,
        bloqueado: true,
        showAlert: true,
        paidForCycle: false,
        code: "BLOCKED",
        message: `Pagamento em atraso há ${diasAtrasado} dias. Acesso suspenso até regularização.`,
        dueAtISO: dueAt.toISOString(),
        dueAt: dueAt.toISOString(),
        days: diasAtrasado,
        phase: "BILLING",
      });
    }

    return buildStatus({
      blocked: false,
      bloqueado: false,
      showAlert: true,
      paidForCycle: false,
      code: "PAST_DUE",
      message: `Assinatura vencida há ${diasAtrasado} dias. Você tem até ${TOLERANCE_DAYS} dias de tolerância para regularizar e evitar bloqueio.`,
      dueAtISO: dueAt.toISOString(),
      dueAt: dueAt.toISOString(),
      days: diasAtrasado,
      phase: "BILLING",
    });
  }

  // agora <= dueAt => não venceu
  const diasAteVenc = Math.max(0, diffDays(dueAt, now));

  if (diasAteVenc <= 5) {
    return buildStatus({
      blocked: false,
      bloqueado: false,
      showAlert: true,
      paidForCycle: false,
      code: "DUE_SOON",
      message:
        diasAteVenc === 0
          ? "Fatura vence hoje. Regularize para evitar bloqueio."
          : `Fatura vence em ${diasAteVenc} dias.`,
      dueAtISO: dueAt.toISOString(),
      dueAt: dueAt.toISOString(),
      days: diasAteVenc,
      phase: "BILLING",
    });
  }

  return buildStatus({
    blocked: false,
    bloqueado: false,
    showAlert: false,
    paidForCycle: false,
    code: "OK",
    message: "Assinatura em aberto.",
    dueAtISO: dueAt.toISOString(),
    dueAt: dueAt.toISOString(),
    days: diasAteVenc,
    phase: "BILLING",
  });
}

// ===== payload p/ bloqueio no login (mantido) =====
export type BillingBlockPayload = {
  code: BillingCode;
  motivo: string;
  empresaId?: string | null;
  empresaNome?: string | null;
  email?: string | null;
  chavePix?: string | null;
  cobrancaWhatsapp?: string | null;
  diaVencimento?: number | null;
  trialAteISO?: string | null;
  pagoAteISO?: string | null;
  dueAtISO?: string | null;
  overdueDays?: number | null;
};

export function buildBillingBlockPayload(payload: BillingBlockPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function buildBillingBlockErrorMessage(
  payload: BillingBlockPayload
): string {
  return `BILLING_BLOCK:${buildBillingBlockPayload(payload)}`;
}
