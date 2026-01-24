// src/lib/billing.ts
export type BillingCode =
  | "OK"
  | "PAGO"
  | "TRIAL"
  | "TRIAL_EXPIRADO"
  | "PROXIMO"
  | "VENCIDO"
  | "BLOQUEIO"
  | "BLOQUEADO_MANUAL"
  | "COBRANCA_DESATIVADA";

export type BillingStatus = {
  blocked: boolean;
  code: BillingCode;
  message: string;
  dueAt: string | null; // ISO
  days: number; // dias para vencer (>=0) ou dias em atraso (>=0)
  isTrial: boolean;
  isPaid: boolean;
};

type EmpresaBillingShape = {
  id: string;
  nome: string;
  status?: string | null; // "ATIVO" | "BLOQUEADO"
  cobrancaAtiva?: boolean | null;

  trialAte?: Date | string | null;
  pagoAte?: Date | string | null;

  diaVencimento?: number | string | null;
  billingAnchorAt?: Date | string | null;

  chavePix?: string | null;
  cobrancaWhatsapp?: string | null;
};

function toDate(d?: Date | string | null): Date | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function daysDiff(a: Date, b: Date) {
  // a - b em dias (inteiro)
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.floor(ms / 86400000);
}

function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDay(year: number, monthIndex: number, day: number) {
  const last = lastDayOfMonth(year, monthIndex);
  return Math.min(Math.max(day, 1), last);
}

function addMonthsKeepingDay(base: Date, months: number, dayWanted: number) {
  const year = base.getFullYear();
  const monthIndex = base.getMonth() + months;

  const y = year + Math.floor(monthIndex / 12);
  const m = ((monthIndex % 12) + 12) % 12;

  const d = clampDay(y, m, dayWanted);
  const out = new Date(y, m, d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Dia padrão do vencimento:
 * - usa empresa.diaVencimento se existir (1..28)
 * - senão usa o dia do billingAnchorAt (1..28)
 * - senão 15
 */
function resolveDueDay(emp: EmpresaBillingShape): number {
  const fromConfig =
    emp.diaVencimento !== null && emp.diaVencimento !== undefined
      ? Number(emp.diaVencimento)
      : NaN;

  if (!Number.isNaN(fromConfig) && fromConfig >= 1 && fromConfig <= 28) return fromConfig;

  const anchor = toDate(emp.billingAnchorAt);
  if (anchor) return Math.min(Math.max(anchor.getDate(), 1), 28);

  return 15;
}

/**
 * Vencimento do ciclo atual (ou próximo se já passou mais de 20 dias do vencimento)
 */
export function computeDueAt(emp: EmpresaBillingShape, nowInput = new Date()): Date {
  const now = startOfDay(nowInput);
  const dueDay = resolveDueDay(emp);

  let due = new Date(now.getFullYear(), now.getMonth(), clampDay(now.getFullYear(), now.getMonth(), dueDay));
  due.setHours(0, 0, 0, 0);

  const diff = daysDiff(due, now); // due - now
  if (diff < -20) {
    due = addMonthsKeepingDay(due, 1, dueDay);
  }

  return due;
}

export function getBillingStatus(emp: EmpresaBillingShape): BillingStatus {
  const now = startOfDay(new Date());

  // ✅ default: cobrança ativa (só desativa se for explicitamente false)
  const cobrancaAtiva = emp?.cobrancaAtiva !== false;

  // 1) bloqueio manual
  if (emp?.status === "BLOQUEADO") {
    const due = computeDueAt(emp, now);
    const diff = daysDiff(due, now);
    const atrasado = diff < 0 ? Math.abs(diff) : 0;

    return {
      blocked: true,
      code: "BLOQUEADO_MANUAL",
      message: "Acesso suspenso manualmente. Entre em contato para regularização.",
      dueAt: due.toISOString(),
      days: atrasado,
      isTrial: false,
      isPaid: false,
    };
  }

  // 2) cobrança desativada => nunca bloqueia
  if (!cobrancaAtiva) {
    const due = computeDueAt(emp, now);
    const diff = daysDiff(due, now);
    return {
      blocked: false,
      code: "COBRANCA_DESATIVADA",
      message: "Cobrança desativada para este cliente.",
      dueAt: due.toISOString(),
      days: Math.abs(diff),
      isTrial: false,
      isPaid: true,
    };
  }

  const trialAte = toDate(emp.trialAte);
  const pagoAte = toDate(emp.pagoAte);

  const paidOk = pagoAte ? now.getTime() <= endOfDay(pagoAte).getTime() : false;
  const trialOk = trialAte ? now.getTime() <= endOfDay(trialAte).getTime() : false;

  // 3) pago => sempre ok
  if (paidOk) {
    const due = computeDueAt(emp, now);
    const diff = daysDiff(due, now);
    return {
      blocked: false,
      code: "PAGO",
      message: "Assinatura em dia.",
      dueAt: due.toISOString(),
      days: diff >= 0 ? diff : Math.abs(diff),
      isTrial: false,
      isPaid: true,
    };
  }

  // 4) trial ativo => ok
  if (trialOk) {
    const due = computeDueAt(emp, now);
    const diff = daysDiff(due, now);
    return {
      blocked: false,
      code: "TRIAL",
      message: "Período de teste ativo.",
      dueAt: due.toISOString(),
      days: diff >= 0 ? diff : Math.abs(diff),
      isTrial: true,
      isPaid: false,
    };
  }

  // ✅ 5) trial expirou e não está pago => BLOQUEIA IMEDIATO
  if (trialAte && !trialOk && !paidOk) {
    const due = startOfDay(trialAte);
    const diff = daysDiff(due, now); // negativo = atrasado
    return {
      blocked: true,
      code: "TRIAL_EXPIRADO",
      message: "Seu teste gratuito expirou. Entre em contato para ativar a assinatura.",
      dueAt: due.toISOString(),
      days: diff < 0 ? Math.abs(diff) : 0,
      isTrial: false,
      isPaid: false,
    };
  }

  // ✅ 6) se tinha pagoAte e venceu, usa o pagoAte como referência de atraso
  if (pagoAte && !paidOk) {
    const due = startOfDay(pagoAte);
    const diff = daysDiff(due, now); // negativo = atrasado
    const atraso = diff < 0 ? Math.abs(diff) : 0;

    if (diff <= -10) {
      return {
        blocked: true,
        code: "BLOQUEIO",
        message: `Fatura vencida há ${atraso} dias. Acesso bloqueado até pagamento.`,
        dueAt: due.toISOString(),
        days: atraso,
        isTrial: false,
        isPaid: false,
      };
    }

    if (diff < 0) {
      return {
        blocked: false,
        code: "VENCIDO",
        message: `Fatura vencida há ${atraso} dias. Evite bloqueio.`,
        dueAt: due.toISOString(),
        days: atraso,
        isTrial: false,
        isPaid: false,
      };
    }
  }

  // 7) fallback: cobrança por vencimento mensal
  const due = computeDueAt(emp, now);
  const diff = daysDiff(due, now); // due - now

  if (diff <= -10) {
    return {
      blocked: true,
      code: "BLOQUEIO",
      message: `Fatura vencida há ${Math.abs(diff)} dias. Acesso bloqueado até pagamento.`,
      dueAt: due.toISOString(),
      days: Math.abs(diff),
      isTrial: false,
      isPaid: false,
    };
  }

  if (diff < 0) {
    return {
      blocked: false,
      code: "VENCIDO",
      message: `Fatura vencida há ${Math.abs(diff)} dias. Evite bloqueio.`,
      dueAt: due.toISOString(),
      days: Math.abs(diff),
      isTrial: false,
      isPaid: false,
    };
  }

  if (diff >= 0 && diff <= 5) {
    return {
      blocked: false,
      code: "PROXIMO",
      message: diff === 0 ? "Fatura vence hoje." : `Fatura vence em ${diff} dias.`,
      dueAt: due.toISOString(),
      days: diff,
      isTrial: false,
      isPaid: false,
    };
  }

  return {
    blocked: false,
    code: "OK",
    message: "Fatura em aberto.",
    dueAt: due.toISOString(),
    days: diff,
    isTrial: false,
    isPaid: false,
  };
}

function base64UrlEncodeUtf8(obj: any): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

export function buildBillingBlockPayload(params: {
  code: string;
  motivo: string;
  empresaId?: string;
  empresaNome?: string;
  email?: string;
  dueAtISO?: string;
  overdueDays?: number;
  chavePix?: string | null;
  cobrancaWhatsapp?: string | null;
}) {
  return base64UrlEncodeUtf8({
    ...params,
    ts: new Date().toISOString(),
  });
}

// ✅ compat
export const makeBillingBlockPayload = buildBillingBlockPayload;
