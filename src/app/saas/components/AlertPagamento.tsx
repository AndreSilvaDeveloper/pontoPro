'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, DollarSign, Building2, Calendar, Crown } from 'lucide-react';

const STORAGE_KEY = 'saas_pagamentos_vistos_v1';
const SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2600/2600-preview.mp3';

const PLANO_LABELS: Record<string, { label: string; cls: string }> = {
  STARTER: { label: 'Starter', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  PROFESSIONAL: { label: 'Professional', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  ENTERPRISE: { label: 'Enterprise', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

type PagamentoRecente = {
  id: string;
  nome: string;
  plano: string;
  pagoEm: string;
  pagoAte: string | null;
};

type Props = {
  pagamentosRecentes: PagamentoRecente[];
};

function getVistos(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function marcarVistos(ids: string[]) {
  try {
    const atuais = getVistos();
    const merged = [...new Set([...atuais, ...ids])];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(-200)));
  } catch {}
}

export default function AlertPagamento({ pagamentosRecentes }: Props) {
  const [novos, setNovos] = useState<PagamentoRecente[]>([]);
  const [visible, setVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!pagamentosRecentes || pagamentosRecentes.length === 0) return;

    const vistos = getVistos();
    // Chave única: id + data do pagamento (para detectar pagamento novo da mesma empresa)
    const naoVistos = pagamentosRecentes.filter(p => {
      const chave = `${p.id}-${p.pagoEm}`;
      return !vistos.includes(chave);
    });

    if (naoVistos.length === 0) return;

    setNovos(naoVistos);
    setVisible(true);

    if (!playedRef.current) {
      playedRef.current = true;
      try {
        const audio = new Audio(SOUND_URL);
        audio.volume = 0.5;
        audioRef.current = audio;
        audio.play().catch(() => {});
      } catch {}
    }
  }, [pagamentosRecentes]);

  const dismiss = useCallback(() => {
    setVisible(false);
    marcarVistos(novos.map(p => `${p.id}-${p.pagoEm}`));
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [novos]);

  if (!visible || novos.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9998] w-80 animate-in slide-in-from-right-full fade-in duration-500">
      <div className="bg-page border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden">
        {/* Barra de progresso */}
        <div className="h-0.5 bg-elevated-solid overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 animate-[shrink_10s_linear_forwards]" />
        </div>

        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-start gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shrink-0">
            <DollarSign size={18} className="text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-400">
              {novos.length === 1 ? 'Pagamento Recebido!' : `${novos.length} Pagamentos Recebidos!`}
            </p>
          </div>

          <button
            onClick={dismiss}
            className="p-1 text-text-dim hover:text-text-secondary rounded-lg hover:bg-hover-bg transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Lista */}
        <div className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto">
          {novos.map((pag) => {
            const planoCfg = PLANO_LABELS[pag.plano] || PLANO_LABELS.PROFESSIONAL;
            const pagoEm = new Date(pag.pagoEm);
            const agora = new Date();
            const diffMs = agora.getTime() - pagoEm.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHoras = Math.floor(diffMs / 3600000);

            let tempo: string;
            if (diffMin < 1) tempo = 'Agora';
            else if (diffMin < 60) tempo = `${diffMin}min atrás`;
            else if (diffHoras < 24) tempo = `${diffHoras}h atrás`;
            else tempo = pagoEm.toLocaleDateString('pt-BR');

            return (
              <div key={`${pag.id}-${pag.pagoEm}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <Building2 size={14} className="text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{pag.nome}</p>
                  <p className="text-[10px] text-text-faint">{tempo}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${planoCfg.cls}`}>
                  {planoCfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
