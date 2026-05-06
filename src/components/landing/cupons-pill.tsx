'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Tag, Copy, Check, ChevronDown, X, Gift, Sparkles } from 'lucide-react';

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

function ofertaCurta(c: CupomLanding): string {
  switch (c.tipo) {
    case 'PERCENTUAL': return `${c.valor}% OFF`;
    case 'VALOR_FIXO': return `R$${c.valor.toFixed(0)} OFF`;
    case 'MESES_GRATIS': return c.valor === 1 ? '1 MÊS GRÁTIS' : `${c.valor} MESES GRÁTIS`;
    case 'TRIAL_ESTENDIDO': return `+${c.valor} DIAS`;
  }
}

function pontuarCupom(c: CupomLanding): number {
  // pontuação simples pra escolher o "mais chamativo"
  switch (c.tipo) {
    case 'PERCENTUAL': return c.valor * 10;
    case 'VALOR_FIXO': return c.valor;
    case 'MESES_GRATIS': return c.valor * 50;
    case 'TRIAL_ESTENDIDO': return c.valor;
  }
}

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
  const [bouncing, setBouncing] = useState(false);
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

  // Bounce a cada 5s — chama atenção sem ser irritante
  useEffect(() => {
    if (fechado || aberto || cupons.length === 0) return;
    const i = setInterval(() => {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 1500);
    }, 5000);
    return () => clearInterval(i);
  }, [fechado, aberto, cupons.length]);

  // Bounce inicial após 1.5s pra atrair o olhar (e depois entra no ciclo)
  useEffect(() => {
    if (fechado || cupons.length === 0) return;
    const t = setTimeout(() => {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 1500);
    }, 1500);
    return () => clearTimeout(t);
  }, [fechado, cupons.length]);

  const melhorCupom = useMemo(() => {
    if (cupons.length === 0) return null;
    return [...cupons].sort((a, b) => pontuarCupom(b) - pontuarCupom(a))[0];
  }, [cupons]);

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
    <div ref={popoverRef} className="fixed bottom-44 right-6 z-40">
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

      {/* Pill fechada — chamativa */}
      <div className="relative">
        {/* Halo glow pulsante atrás da pill */}
        {!aberto && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 opacity-50 blur-xl animate-pulse pointer-events-none" />
        )}

        <button
          onClick={() => setAberto(v => !v)}
          className={`relative flex items-center gap-2 pl-3 pr-3.5 py-2.5 rounded-full border-2 font-bold transition-all ${
            aberto
              ? 'bg-purple-600 border-purple-400 text-white shadow-2xl shadow-purple-500/50'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 border-amber-300 text-white shadow-2xl shadow-amber-500/60 hover:scale-105 hover:shadow-amber-400/80'
          } ${bouncing && !aberto ? 'animate-bounce' : ''}`}
          aria-label="Ver cupons de desconto"
        >
          <span className="relative flex items-center justify-center">
            <Sparkles size={14} className="text-white drop-shadow" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping" />
          </span>

          {melhorCupom && !aberto ? (
            <span className="text-xs font-extrabold tracking-wide whitespace-nowrap">
              {ofertaCurta(melhorCupom)}
            </span>
          ) : (
            <span className="text-xs font-bold">
              {cupons.length === 1 ? 'Cupom ativo' : `${cupons.length} cupons`}
            </span>
          )}

          <ChevronDown size={12} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />

          {/* Badge contador (se múltiplos cupons) */}
          {!aberto && cupons.length > 1 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 border-2 border-white text-[10px] font-extrabold text-white flex items-center justify-center shadow-lg">
              {cupons.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
