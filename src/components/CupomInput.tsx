'use client';

import { useState, useRef } from 'react';
import { Tag, Loader2, Check, X, Info } from 'lucide-react';

type ResultadoOk = {
  ok: true;
  cupom: { codigo: string; nome: string; tipo: string; valor: number; duracaoMeses: number; descricao: string | null };
  descontoPreview: { resumoTexto: string; valorOriginal: number; desconto: number; valorComDesconto: number } | null;
};
type ResultadoErr = { ok: false; mensagem: string };
type Resultado = ResultadoOk | ResultadoErr | null;

type Props = {
  plano?: string;
  ciclo?: 'MONTHLY' | 'YEARLY';
  valorMensal?: number;
  /** Chamado quando código válido é confirmado (ou null quando removido) */
  onChange?: (codigo: string | null) => void;
};

export default function CupomInput({ plano, ciclo, valorMensal, onChange }: Props) {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState<Resultado>(null);
  const [carregando, setCarregando] = useState(false);
  const debounceRef = useRef<any>(null);

  const validar = async (val: string) => {
    if (!val.trim()) {
      setResultado(null);
      onChange?.(null);
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch('/api/cupons/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: val, plano, ciclo, valorMensal }),
      });
      const data = await res.json();
      setResultado(data);
      onChange?.(data?.ok ? val.trim().toUpperCase() : null);
    } catch {
      setResultado({ ok: false, mensagem: 'Erro ao validar.' });
      onChange?.(null);
    } finally {
      setCarregando(false);
    }
  };

  const onCodigoChange = (val: string) => {
    setCodigo(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => validar(val), 400);
  };

  const limpar = () => {
    setCodigo('');
    setResultado(null);
    onChange?.(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-text-muted block">Cupom de desconto (opcional)</label>
      <div className="relative">
        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          value={codigo}
          onChange={e => onCodigoChange(e.target.value.toUpperCase())}
          placeholder="DIATRABALHADOR"
          maxLength={30}
          className={`w-full pl-9 pr-9 py-2.5 rounded-xl bg-elevated border text-sm font-mono outline-none transition-colors ${
            resultado?.ok ? 'border-emerald-500/50' : resultado && !resultado.ok ? 'border-red-500/50' : 'border-border-subtle focus:border-purple-400'
          }`}
        />
        {carregando && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint animate-spin" />
        )}
        {!carregando && resultado?.ok && (
          <button type="button" onClick={limpar} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-red-400" title="Remover">
            <Check size={14} />
          </button>
        )}
        {!carregando && resultado && !resultado.ok && (
          <button type="button" onClick={limpar} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-text-muted" title="Limpar">
            <X size={14} />
          </button>
        )}
      </div>

      {resultado?.ok && resultado.descontoPreview && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <Check size={14} /> Cupom válido — {resultado.cupom.nome}
          </div>
          <p className="text-emerald-200 text-xs mt-1">
            Você economiza <strong>{resultado.descontoPreview.resumoTexto}</strong>
          </p>
          {resultado.cupom.descricao && (
            <p className="text-emerald-100/80 text-[11px] mt-1">{resultado.cupom.descricao}</p>
          )}
        </div>
      )}

      {resultado?.ok && !resultado.descontoPreview && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <Check size={14} /> Cupom válido — {resultado.cupom.nome}
          </div>
          {resultado.cupom.descricao && (
            <p className="text-emerald-200 text-xs mt-1">{resultado.cupom.descricao}</p>
          )}
        </div>
      )}

      {resultado && !resultado.ok && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 flex gap-2 items-start">
          <Info size={12} className="flex-shrink-0 mt-0.5" />
          {resultado.mensagem}
        </div>
      )}
    </div>
  );
}
