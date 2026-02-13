'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Lock, AlertTriangle, Clock, CheckCircle, MessageCircle, Rocket } from 'lucide-react';

type AlertaFinanceiro =
  | { tipo: 'TRIAL'; dias: number }
  | { tipo: 'BLOQUEIO'; dias: number }
  | { tipo: 'VENCIDO'; dias: number }
  | { tipo: 'PROXIMO'; dias: number };

const DISMISS_KEY = 'workid_admin_finance_alert_dismissed_v1';

export default function FinanceAlertBanner({
  alertaFinanceiro,
  empresaNome,
  chavePix,
  linkPagamento = '/admin/perfil',
  suporteWhats = '5532935005492',
}: {
  alertaFinanceiro: AlertaFinanceiro | null;
  empresaNome?: string;
  chavePix?: string | null;
  linkPagamento?: string;
  suporteWhats?: string;
}) {
  const [visivel, setVisivel] = useState(false);

  // Decide se deve aparecer (mostra por padrão, mas respeita "OK" até novo login)
  useEffect(() => {
    if (!alertaFinanceiro) {
      setVisivel(false);
      return;
    }

    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
      setVisivel(!dismissed);
    } catch {
      setVisivel(true);
    }
  }, [alertaFinanceiro?.tipo, alertaFinanceiro?.dias]);

  const waLink = useMemo(() => {
    if (!alertaFinanceiro) return '#';

    const nome = empresaNome ? `Empresa: ${empresaNome}` : 'Empresa: (não informada)';
    const pix = chavePix ? `Chave Pix: ${chavePix}` : 'Chave Pix: (não informada)';

    const msg =
      alertaFinanceiro.tipo === 'TRIAL'
        ? `Olá! ${nome}.\nMeu teste gratuito está acabando e quero ativar a assinatura.\n${pix}\n\nVou enviar o comprovante aqui.`
        : `Olá! ${nome}.\nEstou enviando o comprovante de pagamento da assinatura.\n${pix}\n\nVou anexar o comprovante aqui.`;

    return `https://wa.me/${suporteWhats}?text=${encodeURIComponent(msg)}`;
  }, [alertaFinanceiro, empresaNome, chavePix, suporteWhats]);

  if (!alertaFinanceiro || !visivel) return null;

  const ok = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {}
    setVisivel(false);
  };

  const Actions = ({ invert }: { invert?: boolean }) => (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Link
        href={linkPagamento}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
          invert
            ? 'bg-black text-yellow-400 hover:bg-gray-800'
            : 'bg-white text-slate-900 hover:bg-slate-100'
        }`}
      >
        PAGAR
      </Link>

      <a
        href={waLink}
        target="_blank"
        rel="noreferrer"
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
          invert
            ? 'bg-white/10 text-yellow-100 hover:bg-white/15'
            : 'bg-black/10 text-white hover:bg-black/20'
        }`}
      >
        <MessageCircle size={14} />
        ENVIAR COMPROVANTE
      </a>

      <button
        onClick={ok}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
          invert
            ? 'bg-white text-black hover:bg-slate-100'
            : 'bg-white/20 text-white hover:bg-white/30'
        }`}
      >
        <CheckCircle size={14} />
        OK
      </button>
    </div>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] animate-in slide-in-from-top fade-in duration-500">
      {alertaFinanceiro.tipo === 'TRIAL' && (
        <div className="bg-indigo-600 text-white p-3 flex flex-col md:flex-row items-center justify-center gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <Rocket className="animate-pulse" size={20} />
            <span className="font-bold text-sm uppercase">Teste acabando</span>
          </div>
          <span className="text-sm text-indigo-50 text-center md:text-left">
            Seu teste termina {alertaFinanceiro.dias === 0 ? 'HOJE' : `em ${alertaFinanceiro.dias} dia(s)`}.
            Garanta a continuidade para não perder o acesso.
          </span>
          <Actions />
        </div>
      )}

      {alertaFinanceiro.tipo === 'BLOQUEIO' && (
        <div className="bg-red-600 text-white p-3 flex flex-col md:flex-row items-center justify-center gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <Lock className="animate-pulse" size={20} />
            <span className="font-bold text-sm uppercase">Bloqueio iminente</span>
          </div>
          <span className="text-sm text-center md:text-left">
            Sua fatura venceu há {alertaFinanceiro.dias} dia(s). Regularize para evitar suspensão.
          </span>
          <Actions />
        </div>
      )}

      {alertaFinanceiro.tipo === 'VENCIDO' && (
        <div className="bg-orange-600 text-white p-3 flex flex-col md:flex-row items-center justify-center gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="animate-bounce" size={20} />
            <span className="font-bold text-sm uppercase">Fatura vencida</span>
          </div>
          <span className="text-sm text-center md:text-left">
            Venceu há {alertaFinanceiro.dias} dia(s). Evite o bloqueio do sistema.
          </span>
          <Actions />
        </div>
      )}

      {alertaFinanceiro.tipo === 'PROXIMO' && (
        <div className="bg-yellow-500 text-black p-3 flex flex-col md:flex-row items-center justify-center gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <Clock size={20} />
            <span className="font-bold text-sm uppercase">Fatura em aberto</span>
          </div>
          <span className="text-sm text-center md:text-left">
            Sua fatura vence {alertaFinanceiro.dias === 0 ? 'HOJE' : `em ${alertaFinanceiro.dias} dia(s)`}.
          </span>
          <Actions invert />
        </div>
      )}
    </div>
  );
}
