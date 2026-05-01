'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock, X, AlertCircle, Loader2, FileSignature, ShieldCheck, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { gerarPdfFechamento } from '@/lib/admin/gerarPdfFechamento';

type StatusFechamento = 'PENDENTE' | 'ASSINADO' | 'RECUSADO' | 'CANCELADO';

interface Fechamento {
  id: string;
  status: StatusFechamento;
  periodoInicio: string;
  periodoFim: string;
  criadoEm: string;
  assinadoEm: string | null;
  assinaturaUrl: string | null;
  assinaturaBase64: string | null;
  ipAssinatura: string | null;
  recusadoEm: string | null;
  recusadoMotivo: string | null;
  snapshot: any;
  adminCriador: { nome: string };
}

function formatBR(s: string): string {
  if (s.includes('T')) return new Date(s).toLocaleDateString('pt-BR');
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

const STATUS: Record<StatusFechamento, { txt: string; cls: string; icon: any }> = {
  PENDENTE:  { txt: 'Aguardando você', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  ASSINADO:  { txt: 'Assinado',        cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Check },
  RECUSADO:  { txt: 'Contestado',      cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: AlertCircle },
  CANCELADO: { txt: 'Cancelado',       cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: X },
};

export default function FechamentoDetalheFunc({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [fech, setFech] = useState<Fechamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState<'NENHUMA' | 'ASSINAR' | 'RECUSAR'>('NENHUMA');
  const [senha, setSenha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState<'baixar' | 'visualizar' | null>(null);

  async function gerarPdf(modo: 'baixar' | 'visualizar') {
    if (!fech) return;
    setGerandoPdf(modo);
    try {
      await gerarPdfFechamento({
        snapshot: fech.snapshot,
        status: fech.status,
        assinadoEm: fech.assinadoEm,
        assinaturaUrl: fech.assinaturaUrl,
        assinaturaBase64: fech.assinaturaBase64,
        ipAssinatura: fech.ipAssinatura,
        funcionario: {
          nome: fech.snapshot.funcionario.nome,
          tituloCargo: fech.snapshot.funcionario.cargo,
          cpf: null,
          pis: null,
        },
        modo,
      });
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setGerandoPdf(null);
    }
  }

  async function carregar() {
    try {
      const res = await fetch(`/api/funcionario/fechamentos/${id}`);
      const data = await res.json();
      if (data.erro) toast.error(data.erro);
      else setFech(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [id]);

  async function assinar(e: React.FormEvent) {
    e.preventDefault();
    if (!senha) return toast.error('Informe sua senha');
    setEnviando(true);
    try {
      const res = await fetch(`/api/funcionario/fechamentos/${id}/assinar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.codigo === 'SEM_ASSINATURA') {
          toast.error(data.erro);
          setTimeout(() => router.push('/funcionario/assinatura'), 1500);
          return;
        }
        throw new Error(data.erro || 'Erro');
      }
      toast.success('Fechamento assinado com sucesso!');
      setAcao('NENHUMA');
      setSenha('');
      carregar();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao assinar');
    } finally {
      setEnviando(false);
    }
  }

  async function recusar(e: React.FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < 5) return toast.error('Descreva o motivo (mínimo 5 caracteres)');
    setEnviando(true);
    try {
      const res = await fetch(`/api/funcionario/fechamentos/${id}/recusar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro');
      toast.success('Contestação enviada ao admin');
      setAcao('NENHUMA');
      setMotivo('');
      carregar();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao contestar');
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-page flex items-center justify-center"><Loader2 className="animate-spin text-purple-400" size={28} /></div>;
  if (!fech) return <div className="min-h-screen bg-page flex items-center justify-center text-text-faint text-sm">Fechamento não encontrado.</div>;

  const cfg = STATUS[fech.status];
  const Icon = cfg.icon;
  const snap = fech.snapshot;
  const podeAgir = fech.status === 'PENDENTE';

  return (
    <>
    <div className="min-h-screen bg-page text-text-secondary font-sans relative overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-orb-purple rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-orb-indigo rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md mx-auto p-4 pb-24 relative z-10 space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Link href="/funcionario/fechamentos" className="p-2 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-text-primary leading-none">Fechamento</h1>
            <p className="text-[11px] text-text-muted mt-1 font-mono">
              {formatBR(snap.periodo.inicio)} a {formatBR(snap.periodo.fim)}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${cfg.cls}`}>
            <Icon size={10} /> {cfg.txt}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => gerarPdf('visualizar')}
            disabled={gerandoPdf !== null}
            className="flex-1 px-3 py-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl font-bold text-sm border border-border-subtle transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {gerandoPdf === 'visualizar' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            Visualizar
          </button>
          <button
            onClick={() => gerarPdf('baixar')}
            disabled={gerandoPdf !== null}
            className="flex-1 px-3 py-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl font-bold text-sm border border-border-subtle transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {gerandoPdf === 'baixar' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Baixar PDF
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
            <p className="text-[9px] text-purple-300 uppercase font-bold tracking-wider">Trabalhado</p>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{snap.resumo.totalHorasTrabalhadas}</p>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
            <p className="text-[9px] text-blue-300 uppercase font-bold tracking-wider">Meta</p>
            <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{snap.resumo.totalMetaHoras}</p>
          </div>
          <div className={`p-3 rounded-xl border ${snap.resumo.saldoPositivo ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
            <p className={`text-[9px] uppercase font-bold tracking-wider ${snap.resumo.saldoPositivo ? 'text-emerald-300' : 'text-rose-300'}`}>Saldo</p>
            <p className={`text-lg font-bold font-mono mt-0.5 ${snap.resumo.saldoPositivo ? 'text-emerald-400' : 'text-rose-400'}`}>{snap.resumo.saldoFormatado}</p>
          </div>
          <div className="bg-elevated-solid p-3 rounded-xl border border-border-subtle">
            <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Faltas</p>
            <p className={`text-lg font-bold font-mono mt-0.5 ${snap.resumo.diasFalta > 0 ? 'text-rose-400' : 'text-text-primary'}`}>{snap.resumo.diasFalta}</p>
          </div>
        </div>

        {/* Lista de dias */}
        <div className="bg-surface border border-border-subtle rounded-2xl divide-y divide-border-subtle/50 overflow-hidden">
          {snap.dias.map((d: any) => (
            <div key={d.data} className="p-3 flex items-center gap-3 text-xs">
              <div className="w-14 shrink-0">
                <p className="font-mono font-bold text-text-primary">{d.data.split('-').slice(1).reverse().join('/')}</p>
                <p className="text-[9px] uppercase text-text-faint">{d.diaSemana}</p>
              </div>
              <div className="flex-1 min-w-0">
                {d.batidas?.length > 0 ? (
                  <p className="font-mono text-text-secondary truncate">{d.batidas.join(' · ')}</p>
                ) : (
                  <p className="text-text-faint italic">Sem batidas</p>
                )}
                <p className={`text-[10px] font-bold mt-0.5 ${
                  d.status === 'NORMAL' ? 'text-emerald-400' :
                  d.status === 'ATRASO' ? 'text-amber-400' :
                  d.status === 'FALTA' ? 'text-rose-400' :
                  d.status === 'AUSENCIA' ? 'text-blue-400' :
                  d.status === 'FERIADO' ? 'text-purple-400' :
                  'text-text-faint'
                }`}>{d.status}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-xs font-bold text-text-primary">{Math.floor(d.minutosTrabalhados / 60)}h{String(d.minutosTrabalhados % 60).padStart(2, '0')}</p>
                <p className="font-mono text-[9px] text-text-muted">/{Math.floor(d.metaMinutos / 60)}h{String(d.metaMinutos % 60).padStart(2, '0')}</p>
              </div>
            </div>
          ))}
        </div>

        {fech.status === 'ASSINADO' && fech.assinadoEm && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <ShieldCheck className="text-emerald-400 mx-auto mb-2" size={28} />
            <p className="text-sm font-bold text-emerald-300">Você confirmou este fechamento</p>
            <p className="text-xs text-emerald-200/70 mt-1">{formatDateTime(fech.assinadoEm)}</p>
          </div>
        )}

        {fech.status === 'RECUSADO' && fech.recusadoMotivo && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
            <p className="text-sm font-bold text-rose-300 mb-1">Você contestou:</p>
            <p className="text-sm text-rose-200 whitespace-pre-wrap">{fech.recusadoMotivo}</p>
          </div>
        )}

        {/* Ações (PENDENTE) */}
        {podeAgir && acao === 'NENHUMA' && (
          <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 space-y-3 mt-2">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30 shrink-0">
                <FileSignature className="text-emerald-400" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-300">Confirma seu fechamento</p>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Confira os dias e horários acima. Se estiver tudo certo, assine. Se notar algo errado, use "Contestar".
                </p>
              </div>
            </div>
            <button
              onClick={() => setAcao('ASSINAR')}
              className="w-full px-4 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-[0.99]"
            >
              <FileSignature size={20} /> Conferir e Assinar
            </button>
            <button
              onClick={() => setAcao('RECUSAR')}
              className="w-full px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl font-bold text-sm border border-rose-500/30 transition-all flex items-center justify-center gap-2"
            >
              <X size={16} /> Contestar este fechamento
            </button>
          </div>
        )}

      </div>
    </div>

    {acao === 'ASSINAR' && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <form onSubmit={assinar} className="bg-surface-solid border border-border-default rounded-2xl p-5 w-full max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/15 p-2 rounded-xl border border-emerald-500/30">
              <ShieldCheck className="text-emerald-400" size={20} />
            </div>
            <h3 className="font-bold text-text-primary">Confirme com sua senha</h3>
          </div>
          <p className="text-xs text-text-muted">
            Sua assinatura digital cadastrada será aplicada no documento. Esta ação tem validade legal.
          </p>
          <input
            type="password"
            autoFocus
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="Sua senha"
            className="w-full bg-elevated-solid border border-border-input rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-emerald-500 transition-colors"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAcao('NENHUMA'); setSenha(''); }} className="flex-1 px-4 py-3 bg-hover-bg text-text-secondary rounded-xl font-bold text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="flex-[2] px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-elevated-solid text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Assinar
            </button>
          </div>
        </form>
      </div>
    )}

    {acao === 'RECUSAR' && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <form onSubmit={recusar} className="bg-surface-solid border border-border-default rounded-2xl p-5 w-full max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500/15 p-2 rounded-xl border border-rose-500/30">
              <AlertCircle className="text-rose-400" size={20} />
            </div>
            <h3 className="font-bold text-text-primary">Por que está contestando?</h3>
          </div>
          <p className="text-xs text-text-muted">
            Seu admin será notificado com o motivo. Tente ser específico (qual dia, qual horário etc).
          </p>
          <textarea
            autoFocus
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ex: o dia 10/04 mostra falta mas eu trabalhei normalmente das 8h às 17h"
            rows={4}
            maxLength={500}
            className="w-full bg-elevated-solid border border-border-input rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-rose-500 transition-colors resize-none"
          />
          <p className="text-[10px] text-text-faint text-right">{motivo.length}/500</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAcao('NENHUMA'); setMotivo(''); }} className="flex-1 px-4 py-3 bg-hover-bg text-text-secondary rounded-xl font-bold text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={enviando || motivo.trim().length < 5} className="flex-[2] px-4 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-elevated-solid disabled:text-text-faint text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Enviar
            </button>
          </div>
        </form>
      </div>
    )}
    </>
  );
}
