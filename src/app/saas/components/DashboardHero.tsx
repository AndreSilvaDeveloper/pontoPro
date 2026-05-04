'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TrendingUp, Sparkles } from 'lucide-react';

type Props = {
  mrr: number | undefined;
  totalAtivos: number | undefined;
  totalEmpresas: number | undefined;
  loading: boolean;
};

function saudacaoPorHora() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function fraseDoMomento(): string {
  const frases = [
    'Aqui está um resumo do seu SaaS agora mesmo.',
    'Tudo pronto pra mais um dia produtivo.',
    'Acompanhe seus clientes em tempo real.',
    'Vamos ver como anda a operação.',
  ];
  // Rotação determinística por hora pra não trocar a cada render
  const idx = new Date().getHours() % frases.length;
  return frases[idx];
}

export default function DashboardHero({ mrr, totalAtivos, totalEmpresas, loading }: Props) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  // Evita mismatch de SSR (saudação muda com a hora)
  useEffect(() => { setMounted(true); }, []);

  const primeiroNome = (session?.user?.name || '').split(' ')[0];
  const saudacao = mounted ? saudacaoPorHora() : 'Olá';

  const mrrFormatado = mrr != null
    ? mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-600/20 via-violet-600/10 to-blue-600/10 border border-purple-500/20 rounded-3xl p-6 md:p-8 backdrop-blur animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Decoração */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Saudação */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-purple-300/80 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>WorkID — Painel SaaS</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
            {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''} 👋
          </h2>
          <p className="text-sm text-text-muted">{fraseDoMomento()}</p>
        </div>

        {/* MRR destaque */}
        <div className="md:text-right shrink-0">
          <div className="flex items-center gap-1.5 md:justify-end text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
            <TrendingUp size={11} />
            <span>MRR · Receita recorrente</span>
          </div>
          {loading ? (
            <div className="h-10 w-44 bg-elevated-solid/60 rounded-lg animate-pulse md:ml-auto" />
          ) : (
            <p className="text-3xl md:text-4xl font-extrabold tabular-nums bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              {mrrFormatado}
            </p>
          )}
          <p className="text-[11px] text-text-muted mt-1">
            {loading
              ? 'Calculando...'
              : `${totalAtivos ?? 0} cliente${totalAtivos === 1 ? '' : 's'} ativo${totalAtivos === 1 ? '' : 's'} · ${totalEmpresas ?? 0} no total`}
          </p>
        </div>
      </div>
    </div>
  );
}
