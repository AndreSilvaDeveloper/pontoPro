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

const OK_KEY = "billing_alert_ok_v1";

export default function BillingAlertModal({ empresa, billing }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!billing?.showAlert) return;
    const alreadyOk = sessionStorage.getItem(OK_KEY) === "1";
    if (!alreadyOk) setOpen(true);
  }, [billing]);

  const ui = useMemo(() => {
    const code = billing?.code;

    // perigo/bloqueio
    if (code === "BLOCKED" || code === "MANUAL_BLOCK") {
      return { icon: Lock, title: "Ação necessária", tone: "danger" as const };
    }
    // atraso / vencendo
    if (code === "PAST_DUE" || code === "DUE_SOON" || code === "TRIAL_ENDING") {
      return { icon: AlertTriangle, title: "Atenção", tone: "warn" as const };
    }
    // trial normal
    if (code === "TRIAL_ACTIVE") {
      return { icon: Clock, title: "Período de teste", tone: "trial" as const };
    }
    return { icon: CheckCircle, title: "Tudo certo", tone: "ok" as const };
  }, [billing]);

  if (!open || !billing) return null;

  const Icon = ui.icon;

  const due = billing.dueAtISO ? new Date(billing.dueAtISO) : null;

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}} />

      <div className={`relative w-full max-w-md rounded-2xl border ${bg} p-5 shadow-2xl`}>
        <button
          className="absolute right-3 top-3 text-white/60 hover:text-white"
          onClick={() => setOpen(false)}
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-black/30 p-2">
            <Icon size={22} />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{ui.title}</h3>
            <p className="mt-1 text-sm text-white/80">{billing.message}</p>

            <div className="mt-3 text-xs text-white/70 space-y-1">
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
              >
                Ver fatura / Regularizar
              </Link>

              <button
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
                onClick={() => {
                  sessionStorage.setItem(OK_KEY, "1");
                  setOpen(false);
                }}
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
