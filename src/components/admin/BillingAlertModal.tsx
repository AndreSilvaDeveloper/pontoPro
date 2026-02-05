// src/components/admin/BillingAlertModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Lock, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import type { BillingStatus } from "@/lib/billing";

type Props = {
  empresa?: { id?: string; nome?: string } | null;
  billing?: BillingStatus | null;
};

const OK_KEY = "billing_alert_ok_v1";
const LOGIN_MARKER_KEY = "workid_admin_login_marker_v1";

function makeNonce() {
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function parseDateOnlyToLocal(dateOrIso: string) {
  const base = dateOrIso?.slice(0, 10); // YYYY-MM-DD
  if (!base || base.length !== 10) return null;

  const [y, m, d] = base.split("-").map(Number);
  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d); // 00:00 local
}

export default function BillingAlertModal({ empresa, billing }: Props) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [loginNonce, setLoginNonce] = useState<string | null>(null);

  const prevStatus = useRef<typeof status>(status);

  // 1) gera um nonce por "sessão de login" (refresh não muda; relogin muda)
  useEffect(() => {
    prevStatus.current = status;

    if (status === "unauthenticated") {
      try {
        sessionStorage.removeItem(LOGIN_MARKER_KEY);
      } catch {}
      setLoginNonce(null);
      return;
    }

    if (status === "authenticated") {
      try {
        const userId = (session as any)?.user?.id ?? "no_user";

        const raw = sessionStorage.getItem(LOGIN_MARKER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { userId: string; nonce: string };
          if (parsed?.userId === userId && parsed?.nonce) {
            setLoginNonce(parsed.nonce);
            return;
          }
        }

        const marker = { userId, nonce: makeNonce() };
        sessionStorage.setItem(LOGIN_MARKER_KEY, JSON.stringify(marker));
        setLoginNonce(marker.nonce);
      } catch {
        setLoginNonce(makeNonce());
      }
    }
  }, [status, session]);

  // 2) regra de quando o modal deve estar elegível pra aparecer
  // - 1 dia antes e no dia: DUE_SOON (days 1 ou 0)
  // - no dia e depois: PAST_DUE / BLOCKED / MANUAL_BLOCK (sempre enquanto backend mandar showAlert)
  const shouldShowByRule = useMemo(() => {
    if (!billing?.showAlert) return false;

    const code = billing.code;
    const days = billing.days;

    if (code === "DUE_SOON") {
      return days === 1 || days === 0; // 1 dia antes e no dia
    }

    if (code === "PAST_DUE" || code === "BLOCKED" || code === "MANUAL_BLOCK") {
      return true; // todos os dias depois enquanto em aberto
    }

    // TRIAL_ENDING: se quiser mesma lógica "1 dia antes e no dia", descomente:
    // if (code === "TRIAL_ENDING") return days === 1 || days === 0;

    // se o backend já usa showAlert corretamente pra trial, deixa true:
    if (code === "TRIAL_ENDING" || code === "TRIAL_ACTIVE") return true;

    return false;
  }, [billing]);

  // 3) abre o modal se não foi dado "Ok" neste login
  useEffect(() => {
    if (!billing || !shouldShowByRule) {
      setOpen(false);
      return;
    }

    // evita "piscar" antes do nonce existir
    if (!loginNonce) {
      setOpen(false);
      return;
    }

    try {
      const okForNonce = sessionStorage.getItem(OK_KEY); // guarda o nonce
      if (okForNonce !== loginNonce) setOpen(true);
      else setOpen(false);
    } catch {
      setOpen(true);
    }
  }, [billing, shouldShowByRule, loginNonce]);

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

  const closeModal = () => setOpen(false);

  const ok = () => {
    try {
      if (loginNonce) sessionStorage.setItem(OK_KEY, loginNonce);
    } catch {}
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}} />

      <div className={`relative w-full max-w-md rounded-2xl border ${bg} p-5 shadow-2xl`}>
        <button
          className="absolute right-3 top-3 text-white/60 hover:text-white"
          onClick={closeModal}
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

            <div className="mt-3 space-y-1 text-xs text-white/70">
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

              {/* {billing.days != null && (
                <div>
                  <span className="font-semibold">
                    {billing.phase === "TRIAL" ? "Dias restantes:" : "Dias:"}
                  </span>{" "}
                  {billing.days}
                </div>
              )} */}
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
                onClick={ok}
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
