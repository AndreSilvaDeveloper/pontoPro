'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSignature, ChevronRight } from 'lucide-react';

interface FechamentoLite {
  id: string;
  status: string;
  periodoInicio: string;
  periodoFim: string;
}

function formatBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function BannerFechamentoPendente() {
  const [pendentes, setPendentes] = useState<FechamentoLite[]>([]);

  useEffect(() => {
    let cancelado = false;
    const fetchPend = async () => {
      try {
        const res = await fetch('/api/funcionario/fechamentos');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelado && Array.isArray(data)) {
          setPendentes(data.filter((f: any) => f.status === 'PENDENTE'));
        }
      } catch {}
    };
    fetchPend();
    const handler = () => fetchPend();
    window.addEventListener('fechamentos-update', handler);
    return () => {
      cancelado = true;
      window.removeEventListener('fechamentos-update', handler);
    };
  }, []);

  if (pendentes.length === 0) return null;

  const primeiro = pendentes[0];
  const restantes = pendentes.length - 1;

  return (
    <Link
      href={pendentes.length === 1 ? `/funcionario/fechamentos/${primeiro.id}` : '/funcionario/fechamentos'}
      className="block bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 hover:bg-amber-500/15 transition-all animate-in fade-in slide-in-from-top-2 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30 shrink-0">
          <FileSignature className="text-amber-400" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-300">
            {pendentes.length === 1 ? 'Fechamento aguardando sua assinatura' : `${pendentes.length} fechamentos aguardando você`}
          </p>
          <p className="text-xs text-amber-200/80 mt-0.5">
            {pendentes.length === 1
              ? `Período ${formatBR(primeiro.periodoInicio)} a ${formatBR(primeiro.periodoFim)}`
              : `O mais recente: ${formatBR(primeiro.periodoInicio)} a ${formatBR(primeiro.periodoFim)}${restantes > 0 ? ` + ${restantes}` : ''}`}
          </p>
        </div>
        <ChevronRight className="text-amber-400 shrink-0" size={18} />
      </div>
    </Link>
  );
}
