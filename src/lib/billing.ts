// src/lib/billing.ts
export type BillingCode =
  | "OK"
  | "TRIAL_ACTIVE"
  | "TRIAL_ENDING"
  | "TRIAL_EXPIRED"
  | "DUE_SOON"
  | "PAST_DUE"
  | "BLOCKED"
  | "MANUAL_BLOCK";

export type EmpresaBillingShape = {
  id: string;
  nome: string;
  status?: string | null;

  cobrancaAtiva?: boolean | null;

  trialAte?: Date | string | null;
  pagoAte?: Date | string | null;

  diaVencimento?: number | null;
  billingAnchorAt?: Date | string | null;

  dataUltimoPagamento?: Date | string | null;
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

  // TRIAL: dias desde que expirou (positivo) ou dias restantes (positivo)
  // BILLING: dias atrasado (positivo) ou dias até vencer (positivo)
  days: number | null;

  phase: "TRIAL" | "BILLING";
};

const MS_DAY = 24 * 60 * 60 * 1000;

function toDate(v?: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function diffDays(a: Date, b: Date) {
  // a - b em dias (calendário)
  const aa = startOfDay(a).getTime();
  const bb = startOfDay(b).getTime();
  return Math.round((aa - bb) / MS_DAY);
}

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.max(1, Math.min(day, last));
}

function getDueDateThisMonth(now: Date, diaVencimento: number) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = clampDayToMonth(y, m, diaVencimento);
  return new Date(y, m, d, 0, 0, 0, 0);
}

function buildOk(nextDue?: Date | null): BillingStatus {
  const dueISO = nextDue ? nextDue.toISOString() : null;
  return {
    blocked: false,
    bloqueado: false,
    showAlert: false,
    paidForCycle: true,
    code: "OK",
    message: "Assinatura em dia.",
    dueAtISO: dueISO,
    dueAt: dueISO,
    days: null,
    phase: "BILLING",
  };
}

export function getBillingStatus(empresa?: Partial<EmpresaBillingShape> | null): BillingStatus {
  if (!empresa) {
    return {
      blocked: false,
      bloqueado: false,
      showAlert: false,
      paidForCycle: true,
      code: "OK",
      message: "Sem dados de cobrança.",
      dueAtISO: null,
      dueAt: null,
      days: null,
      phase: "BILLING",
    };
  }

  const status = empresa.status ?? "ATIVO";
  const now = new Date();

  // 1) BLOQUEIO MANUAL (sempre vence tudo)
  if (status === "BLOQUEADO") {
    return {
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
    };
  }

  // 2) Se cobrança NÃO está ativa, não bloqueia e não alerta
  if (empresa.cobrancaAtiva === false) {
    return {
      blocked: false,
      bloqueado: false,
      showAlert: false,
      paidForCycle: true,
      code: "OK",
      message: "Cobrança desativada.",
      dueAtISO: null,
      dueAt: null,
      days: null,
      phase: "BILLING",
    };
  }

  // 3) Se está pago, nunca bloqueia
  const pagoAte = toDate(empresa.pagoAte);
  if (pagoAte && now <= pagoAte) {
    const dia = Number.isFinite(empresa.diaVencimento as any) ? Number(empresa.diaVencimento) : 15;
    const nextDue = getDueDateThisMonth(now, dia);
    if (diffDays(nextDue, now) < 0) nextDue.setMonth(nextDue.getMonth() + 1);
    return buildOk(nextDue);
  }

  // 4) TRIAL: se existe trialAte, ele domina a regra.
  // ✅ acabou o trial e não pagou => BLOQUEIA IMEDIATO
  const trialAte = toDate(empresa.trialAte);
  if (trialAte) {
    if (now <= trialAte) {
      const diasRestantes = Math.max(0, diffDays(trialAte, now));
      const code: BillingCode = diasRestantes <= 3 ? "TRIAL_ENDING" : "TRIAL_ACTIVE";

      return {
        blocked: false,
        bloqueado: false,
        showAlert: true,
        paidForCycle: false,
        code,
        message:
          code === "TRIAL_ENDING"
            ? "Seu período de teste está acabando. Regularize para evitar bloqueio."
            : "Período de teste ativo.",
        dueAtISO: trialAte.toISOString(),
        dueAt: trialAte.toISOString(),
        days: diasRestantes,
        phase: "TRIAL",
      };
    }

    // ✅ TRIAL EXPIRADO => BLOQUEIO NA HORA
    const diasDesdeFim = Math.abs(diffDays(now, trialAte)); // hoje - fimTrial
    return {
      blocked: true,
      bloqueado: true,
      showAlert: true,
      paidForCycle: false,
      code: "TRIAL_EXPIRED",
      message: `Seu período de teste expirou. Acesso bloqueado até regularização.`,
      dueAtISO: trialAte.toISOString(),
      dueAt: trialAte.toISOString(),
      days: diasDesdeFim,
      phase: "TRIAL",
    };
  }

  // 5) Sem trialAte: cai na cobrança por vencimento (diaVencimento)
  const dia = Number.isFinite(empresa.diaVencimento as any) ? Number(empresa.diaVencimento) : 15;
  const due = getDueDateThisMonth(now, dia);

  const diasAteVenc = diffDays(due, now); // >0 falta, 0 hoje, <0 atrasado

  if (diasAteVenc < 0) {
    const diasAtrasado = Math.abs(diasAteVenc);

    if (diasAtrasado >= 10) {
      return {
        blocked: true,
        bloqueado: true,
        showAlert: true,
        paidForCycle: false,
        code: "BLOCKED",
        message: `Pagamento em atraso há ${diasAtrasado} dias. Acesso suspenso até regularização.`,
        dueAtISO: due.toISOString(),
        dueAt: due.toISOString(),
        days: diasAtrasado,
        phase: "BILLING",
      };
    }

    return {
      blocked: false,
      bloqueado: false,
      showAlert: true,
      paidForCycle: false,
      code: "PAST_DUE",
      message: `Fatura vencida há ${diasAtrasado} dias. Regularize para evitar bloqueio.`,
      dueAtISO: due.toISOString(),
      dueAt: due.toISOString(),
      days: diasAtrasado,
      phase: "BILLING",
    };
  }

  if (diasAteVenc <= 5) {
    return {
      blocked: false,
      bloqueado: false,
      showAlert: true,
      paidForCycle: false,
      code: "DUE_SOON",
      message:
        diasAteVenc === 0
          ? "Fatura vence hoje. Regularize para evitar bloqueio."
          : `Fatura vence em ${diasAteVenc} dias.`,
      dueAtISO: due.toISOString(),
      dueAt: due.toISOString(),
      days: diasAteVenc,
      phase: "BILLING",
    };
  }

  return {
    blocked: false,
    bloqueado: false,
    showAlert: false,
    paidForCycle: false,
    code: "OK",
    message: "Assinatura em aberto.",
    dueAtISO: due.toISOString(),
    dueAt: due.toISOString(),
    days: diasAteVenc,
    phase: "BILLING",
  };
}

// ===== payload p/ bloqueio no login =====
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

export function buildBillingBlockErrorMessage(payload: BillingBlockPayload): string {
  return `BILLING_BLOCK:${buildBillingBlockPayload(payload)}`;
}
