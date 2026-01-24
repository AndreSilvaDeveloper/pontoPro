'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Lock, CheckCircle2, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { BillingStatus } from '@/lib/billing';

const OK_KEY = 'workid_billing_alert_ok';

export default function BillingAlertModal({
  empresa,
  billing,
}: {
  empresa: { nome?: string; cobrancaWhatsapp?: string | null } | null;
  billing: BillingStatus | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!billing?.showAlert) return;

    const alreadyOk = sessionStorage.getItem(OK_KEY) === '1';
    if (!alreadyOk) setOpen(true);
  }, [billing]);

  const ui = useMemo(() => {
    const code = billing?.code;

    if (code === 'BLOCKED' || code === 'TRIAL_EXPIRED') {
      return { icon: Lock, title: 'Ação necessária', tone: 'danger' as const };
    }
    if (code === 'PAST_DUE' || code === 'DUE_SOON' || code === 'TRIAL_ENDING') {
      return { icon: AlertTriangle, title: 'Aviso de cobrança', tone: 'warning' as const };
    }
    return { icon: CheckCircle2, title: 'Assinatura', tone: 'success' as const };
  }, [billing]);

  const colors = useMemo(() => {
    if (ui.tone === 'danger') return { bg: 'bg-red-950/60', border: 'border-red-500/30', title: 'text-red-300' };
    if (ui.tone === 'warning') return { bg: 'bg-yellow-950/60', border: 'border-yellow-500/30', title: 'text-yellow-200' };
    return { bg: 'bg-emerald-950/60', border: 'border-emerald-500/30', title: 'text-emerald-200' };
  }, [ui.tone]);

  if (!billing || !open) return null;

  const Icon = ui.icon;

  const onOk = () => {
    sessionStorage.setItem(OK_KEY, '1');
    setOpen(false);
  };

  const onPay = () => {
    sessionStorage.setItem(OK_KEY, '1');
    setOpen(false);
    router.push(billing.payUrl || '/admin/perfil?pay=1');
  };

  const onWhats = () => {
    sessionStorage.setItem(OK_KEY, '1');
    setOpen(false);

    const url = billing.whatsapp?.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else router.push('/admin/perfil?pay=1');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className={`w-full max-w-lg ${colors.bg} ${colors.border} border shadow-2xl`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-3 ${colors.title}`}>
            <span className="p-2 rounded-xl bg-white/5 border border-white/10">
              <Icon size={22} />
            </span>
            {ui.title}
          </CardTitle>
          <CardDescription className="text-slate-300">
            {empresa?.nome ? `Empresa: ${empresa.nome}` : 'WorkID'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-slate-200">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="font-semibold text-white mb-1">Status</p>
            <p className="text-sm">{billing.message}</p>

            {!!billing.dueAt && (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                <Clock size={14} />
                Vencimento: {new Date(billing.dueAt).toLocaleDateString('pt-BR')}
                {typeof billing.days === 'number' ? ` • (${billing.days} dia(s))` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onOk} variant="outline" className="w-full border-white/15 text-white hover:bg-white/10">
              OK, entendi
            </Button>

            <Button onClick={onPay} className="w-full bg-purple-600 hover:bg-purple-700">
              Realizar pagamento
            </Button>

            <Button onClick={onWhats} variant="secondary" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Enviar comprovante <ExternalLink size={16} className="ml-1" />
            </Button>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Depois do OK, este aviso só volta quando você fizer login novamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
