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
 * Tolerância padrão (em dias) após vencer o anchor antes de bloquear.
 * Pode ser sobrescrita via `options.toleranceDays` em getBillingStatus —
 * super admin controla pela config `cobranca.tolerancia_dias` em /saas/configuracoes.
 */
const DEFAULT_TOLERANCE_DAYS = 10;

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

export type BillingOptions = {
  /** Sobrescreve a tolerância padrão (em dias). Vem da config `cobranca.tolerancia_dias`. */
  toleranceDays?: number;
};

export function getBillingStatus(
  empresa?: Partial<EmpresaBillingShape> | null,
  options?: BillingOptions,
): BillingStatus {
  const TOLERANCE_DAYS = Number.isFinite(options?.toleranceDays as number)
    ? Math.max(0, Math.floor(options!.toleranceDays as number))
    : DEFAULT_TOLERANCE_DAYS;

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
    // Compara por dia-calendário (ignora horário)
    const trialDiff = diffDays(trialAte, now);
    if (trialDiff >= 0) {
      const diasRestantes = trialDiff;
      const code: BillingCode = diasRestantes <= 2 ? "TRIAL_ENDING" : "TRIAL_ACTIVE";

      return buildStatus({
        blocked: false,
        bloqueado: false,
        // TRIAL_ACTIVE: modal decide (1x por empresa); TRIAL_ENDING: alerta diário
        showAlert: true,
        paidForCycle: false,
        code,
        message:
          code === "TRIAL_ENDING"
            ? diasRestantes === 0
              ? "Seu período de teste termina hoje!"
              : `Seu período de teste acaba em ${diasRestantes} dia(s).`
            : "Período de teste ativo.",
        dueAtISO: trialAte.toISOString(),
        dueAt: trialAte.toISOString(),
        days: diasRestantes,
        phase: "TRIAL",
      });
    }

    // Trial expirou, mas existe anchor para 1ª fatura ainda no futuro:
    if (anchorAt && diffDays(anchorAt, now) >= 0) {
      // Se já pagou e pagoAte cobre o ciclo, está em dia
      if (pagoAte && diffDays(pagoAte, now) >= 0) {
        const diasAteVencer = diffDays(anchorAt, now);
        return buildStatus({
          blocked: false,
          bloqueado: false,
          showAlert: diasAteVencer <= 3,
          paidForCycle: true,
          code: diasAteVencer <= 3 ? "DUE_SOON" : "OK",
          message: diasAteVencer <= 3
            ? diasAteVencer === 0
              ? "Fatura vence hoje. Regularize para evitar bloqueio."
              : `Fatura vence em ${diasAteVencer} dia(s).`
            : "Assinatura em dia.",
          dueAtISO: anchorAt.toISOString(),
          dueAt: anchorAt.toISOString(),
          days: diasAteVencer,
          phase: "BILLING",
        });
      }

      // Não pagou (ou pagoAte expirou) — mostra alerta só 3 dias antes
      const diasAteVencer = diffDays(anchorAt, now);

      // Se pagoAte existe, empresa já pagou antes — não é "1ª fatura"
      if (pagoAte) {
        return buildStatus({
          blocked: false,
          bloqueado: false,
          showAlert: diasAteVencer <= 3,
          paidForCycle: false,
          code: diasAteVencer <= 3 ? "DUE_SOON" : "OK",
          message:
            diasAteVencer === 0
              ? "Fatura vence hoje. Regularize para evitar bloqueio."
              : diasAteVencer <= 3
                ? `Fatura vence em ${diasAteVencer} dia(s).`
                : "Assinatura em dia.",
          dueAtISO: anchorAt.toISOString(),
          dueAt: anchorAt.toISOString(),
          days: diasAteVencer,
          phase: "BILLING",
        });
      }

      return buildStatus({
        blocked: false,
        bloqueado: false,
        showAlert: diasAteVencer <= 3,
        paidForCycle: false,
        code: diasAteVencer <= 3 ? "DUE_SOON" : "PENDING_FIRST_INVOICE",
        message:
          diasAteVencer === 0
            ? "Sua fatura vence hoje."
            : diasAteVencer <= 3
              ? `Sua fatura vence em ${diasAteVencer} dia(s).`
              : `Próxima fatura em ${diasAteVencer} dia(s).`,
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
  if (pagoAte && diffDays(pagoAte, now) >= 0) {
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
      message:
        diasAtrasado >= TOLERANCE_DAYS
          ? "Último dia! Amanhã seu acesso será bloqueado se o pagamento não for regularizado."
          : diasAtrasado >= TOLERANCE_DAYS - 1
            ? `Atenção: seu acesso será bloqueado em 2 dias se o pagamento não for regularizado. Fatura vencida há ${diasAtrasado} dias.`
            : `Assinatura vencida há ${diasAtrasado} dia(s). Você tem até ${TOLERANCE_DAYS} dias de tolerância para regularizar.`,
      dueAtISO: dueAt.toISOString(),
      dueAt: dueAt.toISOString(),
      days: diasAtrasado,
      phase: "BILLING",
    });
  }

  // agora <= dueAt => não venceu
  const diasAteVenc = Math.max(0, diffDays(dueAt, now));

  // Alerta 3 dias antes do vencimento
  if (diasAteVenc <= 3) {
    return buildStatus({
      blocked: false,
      bloqueado: false,
      showAlert: true,
      paidForCycle: false,
      code: "DUE_SOON",
      message:
        diasAteVenc === 0
          ? "Fatura vence hoje. Regularize para evitar bloqueio."
          : `Fatura vence em ${diasAteVenc} dia(s).`,
      dueAtISO: dueAt.toISOString(),
      dueAt: dueAt.toISOString(),
      days: diasAteVenc,
      phase: "BILLING",
    });
  }

  // Mais de 2 dias até o vencimento — sem alerta
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
