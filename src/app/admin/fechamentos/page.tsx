'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, X, Loader2, FileText, Eye, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type StatusFechamento = 'PENDENTE' | 'ASSINADO' | 'RECUSADO' | 'CANCELADO';

interface Fechamento {
  id: string;
  status: StatusFechamento;
  periodoInicio: string;
  periodoFim: string;
  criadoEm: string;
  assinadoEm: string | null;
  recusadoEm: string | null;
  recusadoMotivo: string | null;
  funcionario: { id: string; nome: string; tituloCargo: string | null };
  adminCriador: { id: string; nome: string };
}

function formatBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

const STATUS_LABEL: Record<StatusFechamento, { txt: string; cls: string; icon: any }> = {
  PENDENTE:  { txt: 'Aguardando', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  ASSINADO:  { txt: 'Assinado',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Check },
  RECUSADO:  { txt: 'Contestado', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: AlertCircle },
  CANCELADO: { txt: 'Cancelado',  cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: X },
};

export default function FechamentosAdminPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Fechamento[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusFechamento>('TODOS');
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fechamentos');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {
      toast.error('Erro ao carregar fechamentos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function cancelar(f: Fechamento) {
    if (!confirm(`Cancelar o fechamento pendente de ${f.funcionario.nome}?\nIsso vai removê-lo do app do funcionário.`)) return;
    setCancelandoId(f.id);
    try {
      const res = await fetch(`/api/admin/fechamentos/${f.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      toast.success('Fechamento cancelado');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao cancelar');
    } finally {
      setCancelandoId(null);
    }
  }

  const filtrados = filtroStatus === 'TODOS' ? items : items.filter(i => i.status === filtroStatus);

  const counts = {
    PENDENTE: items.filter(i => i.status === 'PENDENTE').length,
    ASSINADO: items.filter(i => i.status === 'ASSINADO').length,
    RECUSADO: items.filter(i => i.status === 'RECUSADO').length,
    CANCELADO: items.filter(i => i.status === 'CANCELADO').length,
  };

  return (
    <div className="min-h-screen bg-page text-text-secondary font-sans relative overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto p-4 md:p-8 pb-8 relative z-10 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/relatorio-mensal" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">
              <Check size={24} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Fechamentos de Ponto</h1>
              <p className="text-text-muted text-xs font-medium uppercase tracking-widest">Conferências e assinaturas</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['TODOS', 'PENDENTE', 'ASSINADO', 'RECUSADO', 'CANCELADO'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filtroStatus === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-surface text-text-muted hover:text-text-primary border border-border-subtle'
              }`}
            >
              {s === 'TODOS' ? `Todos (${items.length})` : `${STATUS_LABEL[s].txt} (${counts[s]})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-purple-400" size={32} /></div>
        ) : filtrados.length === 0 ? (
          <div className="bg-surface border border-border-subtle rounded-3xl p-12 text-center text-text-faint text-sm">
            {items.length === 0
              ? 'Nenhum fechamento criado ainda. Vá em Folha de Ponto e clique em "Solicitar" ao lado do funcionário.'
              : 'Nenhum fechamento neste filtro.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(f => {
              const cfg = STATUS_LABEL[f.status];
              const Icon = cfg.icon;
              return (
                <div key={f.id} className="bg-surface backdrop-blur-md border border-border-subtle rounded-2xl p-5 shadow-lg">
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-text-primary">{f.funcionario.nome}</h3>
                        <span className="text-xs text-text-muted">{f.funcionario.tituloCargo}</span>
                      </div>
                      <p className="text-sm text-text-muted mt-1">
                        Período: <span className="font-mono font-semibold text-text-primary">{formatBR(f.periodoInicio)} a {formatBR(f.periodoFim)}</span>
                      </p>
                      <p className="text-[11px] text-text-faint mt-1">
                        Solicitado por {f.adminCriador.nome} em {formatDateTime(f.criadoEm)}
                      </p>
                      {f.status === 'ASSINADO' && f.assinadoEm && (
                        <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                          ✓ Assinado em {formatDateTime(f.assinadoEm)}
                        </p>
                      )}
                      {f.status === 'RECUSADO' && (
                        <div className="mt-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs">
                          <p className="font-bold text-rose-300 mb-1">Motivo da contestação:</p>
                          <p className="text-rose-200">{f.recusadoMotivo}</p>
                          {f.recusadoEm && <p className="text-[10px] text-rose-400 mt-1">{formatDateTime(f.recusadoEm)}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${cfg.cls}`}>
                        <Icon size={12} />
                        {cfg.txt}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/fechamentos/${f.id}`}
                          className="px-3 py-1.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-lg text-[11px] font-bold border border-border-subtle flex items-center gap-1.5"
                        >
                          <Eye size={12} /> Ver
                        </Link>
                        {f.status === 'PENDENTE' && (
                          <button
                            onClick={() => cancelar(f)}
                            disabled={cancelandoId === f.id}
                            className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-lg text-[11px] font-bold border border-rose-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {cancelandoId === f.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
