'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  AlertTriangle,
  Info,
  X,
  Loader,
  CheckCheck,
} from 'lucide-react';
import Link from 'next/link';

type Comunicado = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  autorNome: string;
  criadoEm: string;
  lido: boolean;
  lidoEm: string | null;
};

const TIPO_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icon: any }> = {
  AVISO: { label: 'Aviso', cor: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Bell },
  URGENTE: { label: 'Urgente', cor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle },
  INFORMATIVO: { label: 'Informativo', cor: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Info },
};

export default function ComunicadosFuncionario() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState<Comunicado | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const res = await axios.get('/api/funcionario/comunicados');
      setComunicados(res.data);
    } catch {
      // silently fail
    } finally {
      setCarregando(false);
    }
  };

  const abrirComunicado = async (c: Comunicado) => {
    setSelecionado(c);

    if (!c.lido) {
      try {
        await axios.put('/api/funcionario/comunicados', { comunicadoId: c.id });
        setComunicados((prev) =>
          prev.map((item) =>
            item.id === c.id ? { ...item, lido: true, lidoEm: new Date().toISOString() } : item
          )
        );
        // Dispatch event so BottomNav can update unread count
        window.dispatchEvent(new Event('comunicados-update'));
      } catch {
        // silently fail
      }
    }
  };

  const naoLidos = comunicados.filter((c) => !c.lido).length;

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden pb-20" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Efeitos de fundo */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-lg mx-auto p-4 relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/funcionario"
            className="p-2 hover:bg-hover-bg rounded-xl text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">Comunicados</h1>
            <p className="text-text-muted text-xs">
              {naoLidos > 0 ? `${naoLidos} nao lido(s)` : 'Todos lidos'}
            </p>
          </div>
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader size={24} className="animate-spin text-purple-400" />
            <p className="text-text-muted text-sm">Carregando...</p>
          </div>
        ) : comunicados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              <MessageSquare size={32} className="text-purple-400" />
            </div>
            <p className="text-text-muted text-sm">Nenhum comunicado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {comunicados.map((c) => {
              const cfg = TIPO_CONFIG[c.tipo] || TIPO_CONFIG.AVISO;
              const IconTipo = cfg.icon;

              return (
                <button
                  key={c.id}
                  onClick={() => abrirComunicado(c)}
                  className={`w-full text-left bg-surface backdrop-blur-md border rounded-2xl p-4 shadow-lg transition-all hover:border-purple-500/30 ${
                    !c.lido ? 'border-purple-500/30 bg-purple-500/5' : 'border-border-subtle'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Indicador nao lido */}
                    <div className="mt-1.5 shrink-0">
                      {!c.lido ? (
                        <span className="w-2.5 h-2.5 bg-purple-500 rounded-full block animate-pulse" />
                      ) : (
                        <span className="w-2.5 h-2.5 bg-transparent rounded-full block" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.cor} border ${cfg.border}`}>
                          <IconTipo size={10} />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-text-faint">
                          {format(new Date(c.criadoEm), "dd/MM 'as' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <h3 className={`font-bold truncate ${!c.lido ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {c.titulo}
                      </h3>
                      <p className="text-text-muted text-xs line-clamp-1 mt-0.5">{c.mensagem}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal detalhe */}
      {selecionado && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-overlay backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-solid border border-border-default w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-solid border-b border-border-subtle p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const cfg = TIPO_CONFIG[selecionado.tipo] || TIPO_CONFIG.AVISO;
                  const IconTipo = cfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.cor} border ${cfg.border}`}>
                      <IconTipo size={12} />
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>
              <button
                onClick={() => setSelecionado(null)}
                className="p-1.5 text-text-faint hover:text-text-primary rounded-lg hover:bg-hover-bg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-text-primary">{selecionado.titulo}</h2>

              <div className="flex items-center gap-2 text-xs text-text-faint">
                <span>Por {selecionado.autorNome}</span>
                <span>-</span>
                <span>{format(new Date(selecionado.criadoEm), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</span>
              </div>

              <div className="bg-page border border-border-subtle rounded-xl p-4">
                <p className="text-text-secondary text-sm whitespace-pre-wrap leading-relaxed">
                  {selecionado.mensagem}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCheck size={14} />
                <span>Lido</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
