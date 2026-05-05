'use client';

import { useEffect, useState } from 'react';
import { Tag, Copy, Check, X } from 'lucide-react';

type CupomLanding = {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'PERCENTUAL' | 'VALOR_FIXO' | 'MESES_GRATIS' | 'TRIAL_ESTENDIDO';
  valor: number;
  duracaoMeses: number;
  descricao: string | null;
  destaque: string | null;
  validoAte: string | null;
};

const STORAGE_KEY = 'cupom-banner-fechado';

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
      return `${c.valor} ${c.valor === 1 ? 'mês grátis' : 'meses grátis'} após o trial`;
    case 'TRIAL_ESTENDIDO':
      return `+${c.valor} dias de trial grátis`;
  }
}

export default function CuponsBanner() {
  const [cupons, setCupons] = useState<CupomLanding[]>([]);
  const [fechado, setFechado] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    try {
      setFechado(sessionStorage.getItem(STORAGE_KEY) === '1');
    } catch {}

    fetch('/api/cupons/landing')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.cupons?.length) setCupons(d.cupons);
      })
      .catch(() => {});
  }, []);

  const fechar = () => {
    setFechado(true);
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
  };

  const copiar = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 1500);
  };

  if (fechado || cupons.length === 0) return null;

  // Destaca primeiro cupom; demais ficam compactos
  const principal = cupons[0];
  const outros = cupons.slice(1);

  return (
    <div className="relative z-30 bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-700 text-white border-b border-purple-400/30 shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Tag size={18} className="flex-shrink-0 text-amber-300" />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">
              {principal.destaque && <span className="bg-amber-500/30 px-2 py-0.5 rounded text-[10px] mr-2 align-middle">{principal.destaque}</span>}
              {principal.nome} — <span className="font-extrabold text-amber-200">{descricaoCurta(principal)}</span>
            </div>
            {principal.descricao && (
              <p className="text-[12px] text-purple-100 mt-0.5 line-clamp-1">{principal.descricao}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => copiar(principal.codigo)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors"
            title="Copiar código"
          >
            {principal.codigo}
            {copiado === principal.codigo ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button
            onClick={fechar}
            className="p-1.5 hover:bg-white/10 rounded-lg"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {outros.length > 0 && (
        <div className="container mx-auto px-4 pb-2 flex flex-wrap gap-2 text-[11px]">
          {outros.map(c => (
            <button
              key={c.id}
              onClick={() => copiar(c.codigo)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1 rounded-full transition-colors"
            >
              <span className="font-mono font-bold text-amber-200">{c.codigo}</span>
              <span className="text-purple-100">{descricaoCurta(c)}</span>
              {copiado === c.codigo ? <Check size={10} /> : <Copy size={10} className="text-white/60" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
