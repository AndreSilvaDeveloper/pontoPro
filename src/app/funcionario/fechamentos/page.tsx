'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, X, AlertCircle, FileText, Loader2 } from 'lucide-react';
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
  adminCriador: { nome: string };
}

function formatBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const STATUS: Record<StatusFechamento, { txt: string; cls: string; icon: any }> = {
  PENDENTE:  { txt: 'Aguardando você', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  ASSINADO:  { txt: 'Assinado',        cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Check },
  RECUSADO:  { txt: 'Contestado',      cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: AlertCircle },
  CANCELADO: { txt: 'Cancelado',       cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: X },
};

export default function FechamentosFuncionarioPage() {
  const [items, setItems] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/funcionario/fechamentos')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setItems(d))
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const pendentes = items.filter(i => i.status === 'PENDENTE');
  const outros = items.filter(i => i.status !== 'PENDENTE');

  return (
    <div className="min-h-screen bg-page text-text-secondary font-sans relative overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-orb-purple rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-orb-indigo rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md mx-auto p-4 pb-24 relative z-10 space-y-5">
        <div className="flex items-center gap-3 pt-2">
          <Link href="/funcionario" className="p-2 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-text-primary leading-none">Fechamentos</h1>
            <p className="text-xs text-text-muted mt-1">Confira e assine sua folha do mês</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-400" /></div>
        ) : items.length === 0 ? (
          <div className="bg-surface border border-border-subtle rounded-2xl p-8 text-center text-sm text-text-faint">
            Você ainda não tem nenhum fechamento. Quando seu admin solicitar, aparecerá aqui.
          </div>
        ) : (
          <>
            {pendentes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider font-bold text-amber-400">Pendentes ({pendentes.length})</h2>
                {pendentes.map(f => (
                  <FechamentoCard key={f.id} f={f} destaque />
                ))}
              </div>
            )}

            {outros.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="text-xs uppercase tracking-wider font-bold text-text-muted">Histórico</h2>
                {outros.map(f => <FechamentoCard key={f.id} f={f} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FechamentoCard({ f, destaque }: { f: Fechamento; destaque?: boolean }) {
  const cfg = STATUS[f.status];
  const Icon = cfg.icon;
  return (
    <Link
      href={`/funcionario/fechamentos/${f.id}`}
      className={`block bg-surface border rounded-2xl p-4 shadow-lg transition-all active:scale-[0.99] ${
        destaque ? 'border-amber-500/40 ring-2 ring-amber-500/10' : 'border-border-subtle hover:border-border-default'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary">
            {formatBR(f.periodoInicio)} a {formatBR(f.periodoFim)}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            Solicitado por {f.adminCriador.nome}
          </p>
          {f.status === 'ASSINADO' && f.assinadoEm && (
            <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
              ✓ Assinado em {formatBR(f.assinadoEm)}
            </p>
          )}
          {f.status === 'RECUSADO' && f.recusadoMotivo && (
            <p className="text-[11px] text-rose-300 mt-1 italic line-clamp-1">
              "{f.recusadoMotivo}"
            </p>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 shrink-0 ${cfg.cls}`}>
          <Icon size={10} /> {cfg.txt}
        </span>
      </div>
    </Link>
  );
}
