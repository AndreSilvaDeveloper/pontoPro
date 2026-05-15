'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Wallet, Check, X, Clock, AlertCircle, CircleDollarSign,
  TrendingUp, TrendingDown, ChevronDown, FileSignature,
} from 'lucide-react';

type LancamentoSnap = {
  id: string; tipo: string; descricao: string;
  valor?: number; valorFinal?: number;
  parcelaAtual: number; parcelaTotal: number;
};

type Folha = {
  id: string;
  mes: number;
  ano: number;
  salarioBruto: number;
  totalProventos: number;
  totalDescontos: number;
  valorLiquido: number;
  status: 'FECHADA' | 'ASSINADA' | 'RECUSADA' | 'PAGA';
  fechadaEm: string | null;
  assinadoEm: string | null;
  recusadoEm: string | null;
  recusadoMotivo: string | null;
  pagaEm: string | null;
  comprovanteUrl: string | null;
  detalhamento: any;
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS: Record<Folha['status'], { txt: string; cls: string; icon: any }> = {
  FECHADA:  { txt: 'Aguardando você', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  ASSINADA: { txt: 'Assinada',         cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Check },
  RECUSADA: { txt: 'Contestada',       cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: AlertCircle },
  PAGA:     { txt: 'Paga',             cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: CircleDollarSign },
};

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function FolhaFuncionarioPage() {
  const [folhas, setFolhas] = useState<Folha[]>([]);
  const [loading, setLoading] = useState(true);
  const [acaoModal, setAcaoModal] = useState<{ folha: Folha; modo: 'assinar' | 'recusar' } | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);

  const carregar = () => {
    setLoading(true);
    fetch('/api/funcionario/folha')
      .then(r => r.json())
      .then(d => setFolhas(Array.isArray(d.folhas) ? d.folhas : []))
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const pendentes = folhas.filter(f => f.status === 'FECHADA');
  const outras = folhas.filter(f => f.status !== 'FECHADA');

  return (
    <div className="min-h-screen bg-page text-text-secondary font-sans relative overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-orb-purple rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md mx-auto p-4 pb-24 relative z-10 space-y-5">
        <div className="flex items-center gap-3 pt-2">
          <Link href="/funcionario" className="p-2 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-text-primary leading-none">Folha de pagamento</h1>
            <p className="text-xs text-text-muted mt-1">Confira e assine seus pagamentos</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-400" /></div>
        ) : folhas.length === 0 ? (
          <div className="bg-surface border border-border-subtle rounded-2xl p-8 text-center text-sm text-text-faint">
            <Wallet size={28} className="mx-auto mb-3 text-text-faint" />
            Você ainda não tem nenhuma folha. Quando seu admin fechar a folha do mês, ela aparece aqui.
          </div>
        ) : (
          <>
            {pendentes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider font-bold text-amber-400">Aguardando sua assinatura ({pendentes.length})</h2>
                {pendentes.map(f => (
                  <FolhaCard
                    key={f.id}
                    folha={f}
                    destaque
                    expandida={expandida === f.id}
                    onToggle={() => setExpandida(expandida === f.id ? null : f.id)}
                    onAssinar={() => setAcaoModal({ folha: f, modo: 'assinar' })}
                    onRecusar={() => setAcaoModal({ folha: f, modo: 'recusar' })}
                  />
                ))}
              </div>
            )}

            {outras.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider font-bold text-text-dim">Histórico</h2>
                {outras.map(f => (
                  <FolhaCard
                    key={f.id}
                    folha={f}
                    expandida={expandida === f.id}
                    onToggle={() => setExpandida(expandida === f.id ? null : f.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {acaoModal && (
        <AcaoModal
          folha={acaoModal.folha}
          modo={acaoModal.modo}
          onClose={() => setAcaoModal(null)}
          onConcluido={() => { setAcaoModal(null); carregar(); }}
        />
      )}
    </div>
  );
}

function FolhaCard({
  folha, destaque, expandida, onToggle, onAssinar, onRecusar,
}: {
  folha: Folha;
  destaque?: boolean;
  expandida: boolean;
  onToggle: () => void;
  onAssinar?: () => void;
  onRecusar?: () => void;
}) {
  const st = STATUS[folha.status];
  const StIcon = st.icon;
  const det = folha.detalhamento || {};
  const proventos: LancamentoSnap[] = Array.isArray(det.proventos) ? det.proventos : [];
  const descontos: LancamentoSnap[] = Array.isArray(det.descontos) ? det.descontos : [];

  return (
    <div className={`bg-surface border rounded-2xl overflow-hidden ${destaque ? 'border-amber-500/30' : 'border-border-subtle'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">{MESES[folha.mes - 1]} / {folha.ano}</p>
            {folha.fechadaEm && (
              <p className="text-[11px] text-text-faint mt-0.5">Fechada em {formatBR(folha.fechadaEm)}</p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md border ${st.cls}`}>
            <StIcon size={11} /> {st.txt}
          </span>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2 text-center">
            <p className="text-[9px] uppercase font-bold text-emerald-300">Proventos</p>
            <p className="text-xs font-mono font-bold text-emerald-300">+{brl(folha.totalProventos)}</p>
          </div>
          <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-2 text-center">
            <p className="text-[9px] uppercase font-bold text-red-300">Descontos</p>
            <p className="text-xs font-mono font-bold text-red-300">-{brl(folha.totalDescontos)}</p>
          </div>
          <div className="bg-elevated border border-border-subtle rounded-lg p-2 text-center">
            <p className="text-[9px] uppercase font-bold text-text-dim">Líquido</p>
            <p className="text-xs font-mono font-bold text-text-primary">{brl(folha.valorLiquido)}</p>
          </div>
        </div>

        {folha.status === 'RECUSADA' && folha.recusadoMotivo && (
          <div className="mt-3 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-xs text-rose-300">
            <b>Motivo da contestação:</b> {folha.recusadoMotivo}
          </div>
        )}

        {/* Detalhamento expansível */}
        <button
          onClick={onToggle}
          className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
        >
          {expandida ? 'Ocultar detalhamento' : 'Ver detalhamento'}
          <ChevronDown size={12} className={`transition-transform ${expandida ? 'rotate-180' : ''}`} />
        </button>

        {expandida && (
          <div className="mt-3 space-y-3 border-t border-border-subtle pt-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider mb-1.5 flex items-center gap-1">
                <TrendingUp size={11} /> Proventos
              </p>
              {proventos.length === 0 ? (
                <p className="text-[11px] text-text-faint italic">Nenhum.</p>
              ) : (
                <ul className="space-y-1">
                  {proventos.map(p => (
                    <li key={p.id} className="flex justify-between text-xs">
                      <span className="text-text-secondary truncate pr-2">
                        {p.descricao}{p.parcelaTotal > 1 ? ` (${p.parcelaAtual}/${p.parcelaTotal})` : ''}
                      </span>
                      <span className="font-mono text-emerald-300 shrink-0">+{brl(p.valor || 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-red-300 tracking-wider mb-1.5 flex items-center gap-1">
                <TrendingDown size={11} /> Descontos
              </p>
              {descontos.length === 0 ? (
                <p className="text-[11px] text-text-faint italic">Nenhum.</p>
              ) : (
                <ul className="space-y-1">
                  {descontos.map(d => (
                    <li key={d.id} className="flex justify-between text-xs">
                      <span className="text-text-secondary truncate pr-2">
                        {d.descricao}{d.parcelaTotal > 1 ? ` (${d.parcelaAtual}/${d.parcelaTotal})` : ''}
                      </span>
                      <span className="font-mono text-red-300 shrink-0">-{brl(d.valorFinal || 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      {folha.status === 'FECHADA' && onAssinar && onRecusar && (
        <div className="border-t border-border-subtle p-3 flex gap-2">
          <button
            onClick={onRecusar}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold hover:bg-rose-500/20 transition-colors"
          >
            <X size={14} /> Contestar
          </button>
          <button
            onClick={onAssinar}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
          >
            <FileSignature size={14} /> Assinar
          </button>
        </div>
      )}
    </div>
  );
}

function AcaoModal({
  folha, modo, onClose, onConcluido,
}: {
  folha: Folha;
  modo: 'assinar' | 'recusar';
  onClose: () => void;
  onConcluido: () => void;
}) {
  const [senha, setSenha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const isAssinar = modo === 'assinar';

  const enviar = async () => {
    setEnviando(true);
    try {
      if (isAssinar) {
        if (!senha) { toast.error('Digite sua senha pra assinar.'); setEnviando(false); return; }
        const r = await fetch(`/api/funcionario/folha/${folha.id}/assinar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senha }),
        });
        const d = await r.json();
        if (!r.ok) {
          if (d?.codigo === 'SEM_ASSINATURA') {
            toast.error('Cadastre sua assinatura digital primeiro (menu → Minha Assinatura).');
          } else {
            toast.error(d?.erro || 'Erro ao assinar.');
          }
          setEnviando(false);
          return;
        }
        toast.success('Folha assinada!');
        onConcluido();
      } else {
        if (motivo.trim().length < 5) { toast.error('Explique o motivo da contestação.'); setEnviando(false); return; }
        const r = await fetch(`/api/funcionario/folha/${folha.id}/recusar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo: motivo.trim() }),
        });
        const d = await r.json();
        if (!r.ok) {
          toast.error(d?.erro || 'Erro ao contestar.');
          setEnviando(false);
          return;
        }
        toast.success('Contestação enviada ao admin.');
        onConcluido();
      }
    } catch {
      toast.error('Erro de conexão.');
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-page border border-border-default rounded-t-3xl sm:rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border-subtle px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">
            {isAssinar ? 'Assinar folha' : 'Contestar folha'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:bg-hover-bg"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-elevated/50 border border-border-subtle rounded-xl p-3 text-sm">
            <p className="text-text-muted text-xs">{MESES[folha.mes - 1]} / {folha.ano}</p>
            <p className="font-mono font-bold text-emerald-300 text-lg mt-0.5">{brl(folha.valorLiquido)}</p>
            <p className="text-[11px] text-text-faint">líquido a receber</p>
          </div>

          {isAssinar ? (
            <>
              <p className="text-sm text-text-secondary">
                Ao assinar, você confirma que conferiu os valores acima. Sua assinatura digital cadastrada será anexada.
              </p>
              <div>
                <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Sua senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Digite sua senha pra confirmar"
                  className="w-full mt-1.5 bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Descreva o que está errado. O admin será avisado e poderá corrigir antes de fechar de novo.
              </p>
              <div>
                <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Motivo da contestação</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex.: O desconto X não está correto…"
                  className="w-full mt-1.5 bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-rose-500 resize-none"
                  autoFocus
                />
              </div>
            </>
          )}
        </div>

        <div className="border-t border-border-subtle p-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary">Cancelar</button>
          <button
            onClick={enviar}
            disabled={enviando}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-60 ${
              isAssinar ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {enviando ? <Loader2 size={14} className="animate-spin" /> : (isAssinar ? <FileSignature size={14} /> : <X size={14} />)}
            {isAssinar ? 'Assinar' : 'Enviar contestação'}
          </button>
        </div>
      </div>
    </div>
  );
}
