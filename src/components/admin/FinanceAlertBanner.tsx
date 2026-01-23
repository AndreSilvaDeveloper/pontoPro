'use client';

import Link from 'next/link';
import { Lock, AlertTriangle, Clock } from 'lucide-react';

type AlertaFinanceiro =
  | { tipo: 'BLOQUEIO'; dias: number }
  | { tipo: 'VENCIDO'; dias: number }
  | { tipo: 'PROXIMO'; dias: number };

export default function FinanceAlertBanner({
  alertaFinanceiro,
}: {
  alertaFinanceiro: AlertaFinanceiro | null;
}) {
  if (!alertaFinanceiro) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] animate-in slide-in-from-top fade-in duration-500">
      {alertaFinanceiro.tipo === 'BLOQUEIO' && (
        <div className="bg-red-600 text-white p-3 flex items-center justify-center gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Lock className="animate-pulse" size={20} />
            <span className="font-bold text-sm uppercase">Bloqueio Iminente!</span>
          </div>
          <span className="text-sm hidden md:inline">
            Sua fatura venceu há {alertaFinanceiro.dias} dias. Regularize para evitar suspensão.
          </span>
          <Link
            href="/admin/perfil"
            className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
          >
            RESOLVER AGORA
          </Link>
        </div>
      )}

      {alertaFinanceiro.tipo === 'VENCIDO' && (
        <div className="bg-orange-600 text-white p-3 flex items-center justify-center gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="animate-bounce" size={20} />
            <span className="font-bold text-sm uppercase">Fatura Vencida</span>
          </div>
          <span className="text-sm hidden md:inline">
            Venceu há {alertaFinanceiro.dias} dia(s). Evite o bloqueio do sistema.
          </span>
          <Link
            href="/admin/perfil"
            className="bg-white text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors"
          >
            PAGAR AGORA
          </Link>
        </div>
      )}

      {alertaFinanceiro.tipo === 'PROXIMO' && (
        <div className="bg-yellow-500 text-black p-3 flex items-center justify-center gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Clock size={20} />
            <span className="font-bold text-sm uppercase">Fatura em Aberto</span>
          </div>
          <span className="text-sm hidden md:inline">
            Sua fatura vence {alertaFinanceiro.dias === 0 ? 'HOJE' : `em ${alertaFinanceiro.dias} dias`}.
          </span>
          <Link
            href="/admin/perfil"
            className="bg-black text-yellow-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors"
          >
            VER FATURA
          </Link>
        </div>
      )}
    </div>
  );
}
