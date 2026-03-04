'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Building2, User, Mail, Calendar, Crown } from 'lucide-react';
import Link from 'next/link';

const STORAGE_KEY = 'saas_empresas_vistas_v1';
const SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const PLANO_LABELS: Record<string, { label: string; cls: string }> = {
  STARTER: { label: 'Starter', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  PROFESSIONAL: { label: 'Professional', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  ENTERPRISE: { label: 'Enterprise', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

type EmpresaRecente = {
  id: string;
  nome: string;
  cnpj: string | null;
  plano: string;
  criadoEm: string;
  totalUsuarios: number;
  admins: { id: string; nome: string; email: string; cargo: string }[];
};

type Props = {
  empresasRecentes: EmpresaRecente[];
};

function getVistas(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function marcarVistas(ids: string[]) {
  try {
    const atuais = getVistas();
    const merged = [...new Set([...atuais, ...ids])];
    // Manter só os últimos 200 para não crescer infinito
    const trimmed = merged.slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export default function AlertNovaEmpresa({ empresasRecentes }: Props) {
  const [novas, setNovas] = useState<EmpresaRecente[]>([]);
  const [visible, setVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!empresasRecentes || empresasRecentes.length === 0) return;

    const vistas = getVistas();
    const naoVistas = empresasRecentes.filter(e => !vistas.includes(e.id));

    if (naoVistas.length === 0) return;

    setNovas(naoVistas);
    setVisible(true);

    // Tocar som
    if (!playedRef.current) {
      playedRef.current = true;
      try {
        const audio = new Audio(SOUND_URL);
        audio.volume = 0.6;
        audioRef.current = audio;
        audio.play().catch(() => { /* autoplay blocked */ });
      } catch { /* ignore */ }
    }
  }, [empresasRecentes]);

  const dismiss = useCallback(() => {
    setVisible(false);
    marcarVistas(novas.map(e => e.id));
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [novas]);

  if (!visible || novas.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-page border border-emerald-500/30 rounded-2xl w-full max-w-lg shadow-2xl shadow-emerald-500/10 overflow-hidden">
        {/* Header com animação pulsante */}
        <div className="bg-emerald-600/10 border-b border-emerald-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Building2 size={20} className="text-emerald-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">
                {novas.length}
              </span>
            </div>
            <div>
              <h3 className="text-text-primary font-bold text-lg">
                {novas.length === 1 ? 'Novo Cadastro!' : `${novas.length} Novos Cadastros!`}
              </h3>
              <p className="text-emerald-400/70 text-xs">
                {novas.length === 1 ? 'Uma nova empresa se cadastrou' : 'Novas empresas se cadastraram'}
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-text-faint hover:text-text-primary p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista de empresas */}
        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {novas.map((emp) => {
            const planoCfg = PLANO_LABELS[emp.plano] || PLANO_LABELS.PROFESSIONAL;
            const adminPrincipal = emp.admins?.[0];
            const criadoEm = new Date(emp.criadoEm);
            const agora = new Date();
            const diffMs = agora.getTime() - criadoEm.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHoras = Math.floor(diffMs / 3600000);

            let tempo: string;
            if (diffMin < 1) tempo = 'Agora mesmo';
            else if (diffMin < 60) tempo = `Há ${diffMin} min`;
            else if (diffHoras < 24) tempo = `Há ${diffHoras}h`;
            else tempo = criadoEm.toLocaleDateString('pt-BR');

            return (
              <div
                key={emp.id}
                className="bg-elevated border border-border-subtle rounded-xl p-4 hover:border-emerald-500/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-text-primary font-bold text-sm">{emp.nome}</p>
                    {emp.cnpj && (
                      <p className="text-text-faint text-xs mt-0.5">{emp.cnpj}</p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${planoCfg.cls}`}>
                    {planoCfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {adminPrincipal && (
                    <>
                      <div className="flex items-center gap-1.5 text-text-muted">
                        <User size={12} className="text-text-faint" />
                        <span className="truncate">{adminPrincipal.nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-text-muted">
                        <Mail size={12} className="text-text-faint" />
                        <span className="truncate">{adminPrincipal.email}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Calendar size={12} className="text-text-faint" />
                    <span>{tempo}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Crown size={12} className="text-text-faint" />
                    <span>{emp.admins?.length || 0} admin{emp.admins?.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border-subtle flex justify-end">
                  <Link
                    href={`/saas/${emp.id}`}
                    onClick={dismiss}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    Ver detalhes →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle">
          <button
            onClick={dismiss}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
