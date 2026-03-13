// src/components/admin/BillingAlertModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import type { BillingStatus } from "@/lib/billing";

type Props = {
  empresa?: { id?: string; nome?: string } | null;
  billing?: BillingStatus | null;
};

const BILLING_CLOSED_KEY = "ui:billing-modal-closed:v1";
const BILLING_EVENT = "billing-modal-closed";

// ─── Helpers de storage para controle de frequência ───

/** Chave diária: mostra o alerta 1x por dia para este código */
function dailyKey(code: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `billing_alert_daily_${code}_${today}`;
}

/** Chave permanente: trial visto 1x por empresa (persiste até limpar) */
function trialSeenKey(empresaId: string): string {
  return `billing_trial_first_seen_${empresaId}`;
}

/** Verifica se já mostrou hoje para este código */
function alreadyShownToday(code: string): boolean {
  try {
    return localStorage.getItem(dailyKey(code)) === "1";
  } catch {
    return false;
  }
}

/** Marca que já mostrou hoje para este código */
function markShownToday(code: string): void {
  try {
    localStorage.setItem(dailyKey(code), "1");
  } catch {}
}

/** Verifica se o trial já foi visto (primeiro acesso) */
function trialAlreadySeen(empresaId: string): boolean {
  try {
    return localStorage.getItem(trialSeenKey(empresaId)) === "1";
  } catch {
    return false;
  }
}

/** Marca o trial como visto (primeiro acesso) */
function markTrialSeen(empresaId: string): void {
  try {
    localStorage.setItem(trialSeenKey(empresaId), "1");
  } catch {}
}

/**
 * Decide se o alerta deve ser mostrado com base no código e frequência desejada:
 *
 * - TRIAL_ACTIVE (> 2 dias): mostra apenas no primeiro acesso por empresa
 * - TRIAL_ENDING (≤ 2 dias): mostra 1x por dia
 * - DUE_SOON (≤ 2 dias até vencer): mostra 1x por dia
 * - PENDING_FIRST_INVOICE: mostra 1x por dia (billing.ts já filtra > 2 dias)
 * - PAST_DUE (vencida): mostra 1x por dia
 * - BLOCKED / MANUAL_BLOCK: mostra sempre (cada sessão)
 * - OK: nunca mostra
 */
function shouldShowAlert(
  billing: BillingStatus,
  empresaId: string | undefined
): boolean {
  if (!billing.showAlert) return false;

  const code = billing.code;

  // Bloqueio: sempre mostra (sessionStorage — cada sessão)
  if (code === "BLOCKED" || code === "MANUAL_BLOCK") {
    try {
      const sessionKey = `billing_blocked_session`;
      if (sessionStorage.getItem(sessionKey) === "1") return false;
      return true;
    } catch {
      return true;
    }
  }

  // Trial ativo (> 2 dias restantes): mostra 1x por empresa (primeiro acesso)
  if (code === "TRIAL_ACTIVE") {
    const eid = empresaId || "unknown";
    if (trialAlreadySeen(eid)) return false;
    return true;
  }

  // Todos os outros: 1x por dia
  if (alreadyShownToday(code)) return false;
  return true;
}

function parseDateOnlyToLocal(dateOrIso: string) {
  const base = dateOrIso?.slice(0, 10);
  if (!base || base.length !== 10) return null;

  const [y, m, d] = base.split("-").map(Number);
  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d);
}

function fireBillingDone() {
  (window as any).__billingDone = true;
  window.dispatchEvent(new Event(BILLING_EVENT));
}

export default function BillingAlertModal({ empresa, billing }: Props) {
  const [open, setOpen] = useState(false);
  const [tourDone, setTourDone] = useState(false);

  // Espera o tour terminar antes de avaliar
  useEffect(() => {
    const w = window as any;
    if (w.__tourDone) { setTourDone(true); return; }
    const handler = () => setTourDone(true);
    window.addEventListener('tour-done', handler);
    return () => window.removeEventListener('tour-done', handler);
  }, []);

  useEffect(() => {
    if (!tourDone) return;
    if (!billing) {
      fireBillingDone();
      return;
    }
    const show = shouldShowAlert(billing, empresa?.id);
    if (show) {
      setOpen(true);
    } else {
      fireBillingDone();
    }
  }, [tourDone, billing, empresa?.id]);

  const closeModal = () => {
    setOpen(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          localStorage.setItem(BILLING_CLOSED_KEY, "1");
        } catch {}

        fireBillingDone();
      });
    });
  };

  const dismiss = () => {
    if (!billing) return;
    const code = billing.code;

    // Marcar como visto de acordo com a frequência
    if (code === "BLOCKED" || code === "MANUAL_BLOCK") {
      try {
        sessionStorage.setItem("billing_blocked_session", "1");
      } catch {}
    } else if (code === "TRIAL_ACTIVE") {
      markTrialSeen(empresa?.id || "unknown");
    } else {
      markShownToday(code);
    }

    closeModal();
  };

  const ui = useMemo(() => {
    const code = billing?.code;

    if (code === "BLOCKED" || code === "MANUAL_BLOCK") {
      return { icon: Lock, title: "Ação necessária", tone: "danger" as const };
    }
    if (code === "PAST_DUE" || code === "DUE_SOON" || code === "TRIAL_ENDING") {
      return { icon: AlertTriangle, title: "Atenção", tone: "warn" as const };
    }
    if (code === "TRIAL_ACTIVE") {
      return { icon: Clock, title: "Período de teste", tone: "trial" as const };
    }
    return { icon: CheckCircle, title: "Tudo certo", tone: "ok" as const };
  }, [billing]);

  if (!open || !billing) return null;

  const Icon = ui.icon;

  const due = billing.dueAtISO ? parseDateOnlyToLocal(billing.dueAtISO) : null;

  const bg =
    ui.tone === "danger"
      ? "bg-red-950/60 border-red-500/30"
      : ui.tone === "warn"
      ? "bg-yellow-950/50 border-yellow-500/30"
      : ui.tone === "trial"
      ? "bg-amber-950/40 border-amber-500/30"
      : "bg-emerald-950/40 border-emerald-500/30";

  const btn =
    ui.tone === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : ui.tone === "warn"
      ? "bg-yellow-500 hover:bg-yellow-600 text-black"
      : "bg-amber-500 hover:bg-amber-600 text-black";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      data-billing-modal="open"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}} />

      <div className={`relative w-full max-w-md rounded-2xl border ${bg} p-5 shadow-2xl`}>
        <button
          className="absolute right-3 top-3 text-text-primary/60 hover:text-text-primary"
          onClick={dismiss}
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-black/30 p-2">
            <Icon size={22} />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-text-primary">{ui.title}</h3>
            <p className="mt-1 text-sm text-text-primary/80">{billing.message}</p>

            <div className="mt-3 text-xs text-text-primary/70 space-y-1">
              <div>
                <span className="font-semibold">Empresa:</span> {empresa?.nome ?? "—"}
              </div>

              {due && (
                <div>
                  <span className="font-semibold">
                    {billing.phase === "TRIAL" ? "Fim do teste:" : "Vencimento:"}
                  </span>{" "}
                  {due.toLocaleDateString("pt-BR")}
                </div>
              )}

              {billing.days != null && (
                <div>
                  <span className="font-semibold">
                    {billing.phase === "TRIAL" ? "Dias restantes:" : "Dias:"}
                  </span>{" "}
                  {billing.days}
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <Link
                href="/admin/perfil"
                className={`flex-1 rounded-xl px-4 py-2 text-center text-sm font-bold ${btn}`}
                onClick={dismiss}
              >
                Ver detalhes da cobrança
              </Link>

              <button
                className="rounded-xl bg-hover-bg-strong px-4 py-2 text-sm font-bold text-text-primary hover:bg-white/15"
                onClick={dismiss}
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
