'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { format } from 'date-fns';
import { X, Lock, AlertTriangle, Clock, CheckCircle, FileText } from 'lucide-react';

import type { BillingStatus, BillingCode } from '@/lib/billing';

const OK_KEY = 'billing_alert_ok_v3';

type Props = {
  // ✅ compat com chamada antiga do seu /admin/page.tsx
  empresa?: any;
  billing?: BillingStatus | null;

  // ✅ opcional (caso você injete billing via server/layout)
  initialBilling?: BillingStatus | null;
};

function safeDateLabel(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return format(d, 'dd/MM/yyyy');
}

export default function BillingAlertModal({
  empresa,
  billing: billingProp = null,
  initialBilling = null,
}: Props) {
  const router = useRouter();

  const [billing, setBilling] = useState<BillingStatus | null>(
    billingProp ?? initialBilling ?? null
  );
  const [open, setOpen] = useState(false);

  // ✅ Mantém sincronizado caso o caller passe billing depois
  useEffect(() => {
    if (billingProp) setBilling(billingProp);
  }, [billingProp]);

  // ✅ Busca billing se não veio por props
  useEffect(() => {
    if (billing) return;

    let cancelled = false;

    axios
      .get('/api/empresa/billing-status')
      .then((res) => {
        if (cancelled) return;
        if (res.data?.ok && res.data?.billing) setBilling(res.data.billing);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [billing]);

  // ✅ Regra de exibição do alerta (SEM usar billing.showAlert)
  const shouldShow = useMemo(() => {
    if (!billing) return false;

    const code = billing.code as BillingCode | undefined;

    const blocked = Boolean((billing as any).blocked ?? (billing as any).bloqueado ?? false);

    // Mostra se está bloqueado OU tem algum estado que exige atenção.
    // Se tiver seu "OK" ou "PAGO", a gente não mostra.
    if (blocked) return true;

    if (!code) return false;
    if (code === 'PAGO' || (code as any) === 'OK') return false;

    // para TRIAL / PROXIMO / VENCIDO / etc, mostra sim
    return true;
  }, [billing]);

  // Abre modal 1x (até usuário dar ok)
  useEffect(() => {
    if (!shouldShow) return;

    const alreadyOk = sessionStorage.getItem(OK_KEY) === '1';
    if (!alreadyOk) setOpen(true);
  }, [shouldShow]);

  const ui = useMemo(() => {
    const code: BillingCode | undefined = billing?.code as any;

    // Defaults
    let Icon = FileText;
    let title = 'Minha Assinatura';
    let tone: 'success' | 'warning' | 'danger' | 'info' = 'info';

    const blocked = Boolean((billing as any)?.blocked ?? (billing as any)?.bloqueado ?? false);

    // 🚫 Bloqueios
    if (
      blocked ||
      code === 'BLOQUEIO' ||
      (code as any) === 'BLOQUEADO_MANUAL' ||
      code === 'TRIAL_EXPIRADO'
    ) {
      Icon = Lock;
      title = 'Ação necessária';
      tone = 'danger';
      return { Icon, title, tone };
    }

    // 🔴 Vencido
    if (code === 'VENCIDO') {
      Icon = AlertTriangle;
      title = 'Fatura vencida';
      tone = 'danger';
      return { Icon, title, tone };
    }

    // 🟡 Próximo vencimento
    if (code === 'PROXIMO') {
      Icon = Clock;
      title = 'Vencimento próximo';
      tone = 'warning';
      return { Icon, title, tone };
    }

    // 🟠 Trial
    if (code === 'TRIAL') {
      Icon = Clock;
      title = 'Período de teste';
      tone = 'warning';
      return { Icon, title, tone };
    }

    // 🟢 Pago
    if (code === 'PAGO') {
      Icon = CheckCircle;
      title = 'Em dia';
      tone = 'success';
      return { Icon, title, tone };
    }

    return { Icon, title, tone };
  }, [billing]);

  if (!shouldShow) return null;
  if (!open) return null;

  // ✅ suporta "dueAt" (novo) e "dueAtISO" (antigo) sem quebrar o typecheck
  const dueAt = (billing as any)?.dueAtISO ?? billing?.dueAt ?? null;
  const vencLabel = safeDateLabel(dueAt);

  const msg = (billing as any)?.message ?? (billing as any)?.mensagem ?? '';

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(OK_KEY, '1');
    } catch {}
  };

  const irParaPerfil = () => {
    close();
    router.push('/admin/perfil');
  };

  const overlayTone =
    ui.tone === 'danger'
      ? 'border-red-500/30 bg-red-950/30'
      : ui.tone === 'warning'
      ? 'border-yellow-500/30 bg-yellow-950/30'
      : ui.tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-950/30'
      : 'border-slate-700 bg-slate-900';

  const titleTone =
    ui.tone === 'danger'
      ? 'text-red-300'
      : ui.tone === 'warning'
      ? 'text-yellow-300'
      : ui.tone === 'success'
      ? 'text-emerald-300'
      : 'text-white';

  const buttonTone =
    ui.tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : ui.tone === 'warning'
      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
      : 'bg-slate-800 hover:bg-slate-700';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border ${overlayTone} shadow-2xl`}>
        <div className="p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-black/30">
              <ui.Icon size={22} className={titleTone} />
            </div>

            <div>
              <h3 className={`font-extrabold text-lg ${titleTone}`}>{ui.title}</h3>

              <p className="text-slate-200/80 text-sm mt-1">{msg}</p>

              <div className="text-xs text-slate-300/70 mt-3 space-y-1">
                {empresa?.nome && (
                  <p>
                    <span className="font-bold">Empresa:</span> {empresa.nome}
                  </p>
                )}

                {vencLabel && (
                  <p>
                    <span className="font-bold">Vencimento:</span> {vencLabel}
                  </p>
                )}

                {typeof (billing as any)?.days === 'number' && (
                  <p>
                    <span className="font-bold">Dias:</span> {(billing as any).days}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={close}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={irParaPerfil}
            className={`flex-1 py-3 rounded-xl font-bold text-sm ${buttonTone} transition-colors`}
          >
            Ver fatura / Regularizar
          </button>

          <button
            onClick={close}
            className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
