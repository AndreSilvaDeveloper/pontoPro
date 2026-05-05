'use client';

import { useEffect, useRef, useState } from 'react';
import { Tag, Copy, Check, ChevronDown, X, Gift } from 'lucide-react';

type CupomLanding = {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'PERCENTUAL' | 'VALOR_FIXO' | 'MESES_GRATIS' | 'TRIAL_ESTENDIDO';
  valor: number;
  duracaoMeses: number;
  descricao: string | null;
  destaque: string | null;
};

const STORAGE_KEY = 'cupom-pill-fechado';

function descricaoCurta(c: CupomLanding): string {
  switch (c.tipo) {
    case 'PERCENTUAL': {
      const dur = c.duracaoMeses === -1 ? 'sempre' : c.duracaoMeses === 1 ? 'no 1º mês' : `nas ${c.duracaoMeses} primeiras parcelas`;
      return `${c.valor}% off ${dur}`;
    }
    case 'VALOR_FIXO': {
      const dur = c.duracaoMeses === -1 ? 'sempre' : c.duracaoMeses === 1 ? 'no 1º mês' : `nas ${c.duracaoMeses} primeiras parcelas`;
      return `R$ ${c.valor.toFixed(2).replace('.', ',')} off ${dur}`;
    }
    case 'MESES_GRATIS':
      return `${c.valor} ${c.valor === 1 ? 'mês grátis' : 'meses grátis'}`;
    case 'TRIAL_ESTENDIDO':
      return `+${c.valor} dias de teste`;
  }
}

export default function CuponsPill() {
  const [cupons, setCupons] = useState<CupomLanding[]>([]);
  const [fechado, setFechado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setFechado(sessionStorage.getItem(STORAGE_KEY) === '1');
    } catch {}

    fetch('/api/cupons/landing')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.cupons?.length) setCupons(d.cupons);
      })
      .catch(() => {});
  }, []);

  // Fecha popover ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [aberto]);

  const fechar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFechado(true);
    setAberto(false);
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
  };

  const copiar = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 1500);
  };

  if (fechado || cupons.length === 0) return null;

  return (
    <div ref={popoverRef} className="fixed bottom-24 right-6 z-40">
      {/* Popover expandido */}
      {aberto && (
        <div className="absolute bottom-full right-0 mb-2 w-80 max-w-[calc(100vw-3rem)] bg-[#0e1330] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-4 py-2.5 border-b border-purple-500/20 flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20">
            <div className="flex items-center gap-2">
              <Gift size={14} className="text-amber-300" />
              <span className="text-sm font-bold text-white">
                {cupons.length === 1 ? 'Cupom ativo' : `${cupons.length} cupons ativos`}
              </span>
            </div>
            <button
              onClick={fechar}
              className="p-1 hover:bg-white/10 rounded text-text-muted"
              aria-label="Não mostrar mais"
              title="Não mostrar mais nesta sessão"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-purple-500/10">
            {cupons.map(c => (
              <div key={c.id} className="px-4 py-3">
                {c.destaque && (
                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1.5">
                    {c.destaque}
                  </span>
                )}
                <div className="text-sm font-bold text-white">{c.nome}</div>
                <div className="text-xs text-purple-200 mt-0.5">{descricaoCurta(c)}</div>
                {c.descricao && (
                  <p className="text-[11px] text-text-muted mt-1 line-clamp-2">{c.descricao}</p>
                )}
                <button
                  onClick={() => copiar(c.codigo)}
                  className="mt-2 w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/30 text-xs font-mono font-bold text-amber-200 transition-colors"
                >
                  <span>{c.codigo}</span>
                  {copiado === c.codigo ? (
                    <span className="flex items-center gap-1 text-emerald-300 font-sans"><Check size={11} /> Copiado</span>
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pill fechada */}
      <button
        onClick={() => setAberto(v => !v)}
        className={`group flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-lg transition-all backdrop-blur-md ${
          aberto
            ? 'bg-purple-600 border-purple-400 text-white shadow-purple-500/40'
            : 'bg-[#0e1330]/90 border-purple-500/40 text-purple-200 hover:bg-purple-950/80 hover:border-purple-500/60'
        }`}
        aria-label="Mostrar cupons disponíveis"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300" />
        </span>
        <Tag size={13} className="text-amber-300" />
        <span className="text-xs font-bold">
          {cupons.length === 1 ? 'Cupom ativo' : `${cupons.length} cupons`}
        </span>
        <ChevronDown size={12} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
