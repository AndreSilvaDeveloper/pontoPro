'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, Check, Clock, X, AlertCircle, FileText, Eye } from 'lucide-react';
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
  ipAssinatura: string | null;
  recusadoEm: string | null;
  recusadoMotivo: string | null;
  snapshot: any;
  funcionario: { id: string; nome: string; tituloCargo: string | null; cpf: string | null; pis: string | null };
  adminCriador: { id: string; nome: string };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

const STATUS: Record<StatusFechamento, { txt: string; cls: string; icon: any }> = {
  PENDENTE:  { txt: 'Aguardando assinatura', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  ASSINADO:  { txt: 'Assinado',              cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Check },
  RECUSADO:  { txt: 'Contestado',            cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: AlertCircle },
  CANCELADO: { txt: 'Cancelado',             cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: X },
};

export default function FechamentoDetalheAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [fech, setFech] = useState<Fechamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState<'baixar' | 'visualizar' | null>(null);

  useEffect(() => {
    fetch(`/api/admin/fechamentos/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) toast.error(data.erro);
        else setFech(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function gerarPdf(modo: 'baixar' | 'visualizar') {
    if (!fech) return;
    setGerandoPdf(modo);
    try {
      await gerarPdfFechamento({
        snapshot: fech.snapshot,
        status: fech.status,
        assinadoEm: fech.assinadoEm,
        assinaturaUrl: fech.assinaturaUrl,
        ipAssinatura: fech.ipAssinatura,
        funcionario: fech.funcionario,
        modo,
      });
    } catch (e: any) {
      toast.error('Erro ao gerar PDF');
      console.error(e);
    } finally {
      setGerandoPdf(null);
    }
  }

  if (loading) return <div className="min-h-screen bg-page flex items-center justify-center"><Loader2 className="animate-spin text-purple-400" size={32} /></div>;
  if (!fech) return <div className="min-h-screen bg-page flex items-center justify-center text-text-faint">Fechamento não encontrado.</div>;

  const cfg = STATUS[fech.status];
  const Icon = cfg.icon;
  const snap = fech.snapshot;

  return (
    <div className="min-h-screen bg-page text-text-secondary font-sans relative overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto p-4 md:p-8 pb-12 relative z-10 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/fechamentos" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-text-primary">{fech.funcionario.nome}</h1>
            <p className="text-xs text-text-muted uppercase tracking-wider">{fech.funcionario.tituloCargo}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${cfg.cls}`}>
            <Icon size={14} /> {cfg.txt}
          </span>
        </div>

        {/* Resumo */}
        <div className="bg-surface backdrop-blur-md border border-border-subtle rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Período</p>
              <p className="font-mono text-lg font-bold text-text-primary mt-1">
                {new Date(fech.periodoInicio).toLocaleDateString('pt-BR')} a {new Date(fech.periodoFim).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => gerarPdf('visualizar')}
                disabled={gerandoPdf !== null}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
              >
                {gerandoPdf === 'visualizar' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                Visualizar
              </button>
              <button
                onClick={() => gerarPdf('baixar')}
                disabled={gerandoPdf !== null}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-elevated-solid text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
              >
                {gerandoPdf === 'baixar' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Baixar PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
              <p className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">Horas trab.</p>
              <p className="text-xl font-bold font-mono text-text-primary mt-1">{snap.resumo.totalHorasTrabalhadas}</p>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
              <p className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Meta</p>
              <p className="text-xl font-bold font-mono text-text-primary mt-1">{snap.resumo.totalMetaHoras}</p>
            </div>
            <div className={`p-4 rounded-xl border ${snap.resumo.saldoPositivo ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              <p className={`text-[10px] uppercase font-bold tracking-wider ${snap.resumo.saldoPositivo ? 'text-emerald-300' : 'text-rose-300'}`}>Saldo</p>
              <p className={`text-xl font-bold font-mono mt-1 ${snap.resumo.saldoPositivo ? 'text-emerald-400' : 'text-rose-400'}`}>{snap.resumo.saldoFormatado}</p>
            </div>
            <div className="bg-elevated-solid p-4 rounded-xl border border-border-subtle">
              <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Faltas</p>
              <p className={`text-xl font-bold font-mono mt-1 ${snap.resumo.diasFalta > 0 ? 'text-rose-400' : 'text-text-primary'}`}>{snap.resumo.diasFalta}</p>
            </div>
          </div>

          {fech.status === 'ASSINADO' && fech.assinaturaUrl && fech.assinadoEm && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
              <div className="bg-white rounded-lg p-2 shrink-0">
                <img src={fech.assinaturaUrl} alt="Assinatura" className="h-16 object-contain" />
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-emerald-300">Confirmado pelo funcionário</p>
                <p className="text-emerald-200 mt-1">{formatDateTime(fech.assinadoEm)}</p>
                {fech.ipAssinatura && <p className="text-emerald-200/70 text-[10px] mt-1 font-mono">IP: {fech.ipAssinatura}</p>}
              </div>
            </div>
          )}

          {fech.status === 'RECUSADO' && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
              <p className="font-bold text-rose-300 text-sm mb-1">Funcionário discordou:</p>
              <p className="text-rose-200 text-sm whitespace-pre-wrap">{fech.recusadoMotivo}</p>
              {fech.recusadoEm && <p className="text-[11px] text-rose-400 mt-2">{formatDateTime(fech.recusadoEm)}</p>}
            </div>
          )}
        </div>

        {/* Tabela de dias */}
        <div className="bg-surface backdrop-blur-md border border-border-subtle rounded-3xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left p-3 text-[10px] uppercase font-bold text-text-faint tracking-wider">Data</th>
                  <th className="text-center p-3 text-[10px] uppercase font-bold text-text-faint tracking-wider">Dia</th>
                  <th className="text-center p-3 text-[10px] uppercase font-bold text-text-faint tracking-wider">Status</th>
                  <th className="text-left p-3 text-[10px] uppercase font-bold text-text-faint tracking-wider">Batidas</th>
                  <th className="text-center p-3 text-[10px] uppercase font-bold text-text-faint tracking-wider">Trab.</th>
                  <th className="text-center p-3 text-[10px] uppercase font-bold text-text-faint tracking-wider">Meta</th>
                </tr>
              </thead>
              <tbody>
                {snap.dias.map((d: any) => (
                  <tr key={d.data} className="border-b border-border-subtle/30 hover:bg-hover-bg transition-colors">
                    <td className="p-3 font-mono text-text-primary text-xs">
                      {d.data.split('-').reverse().join('/')}
                    </td>
                    <td className="p-3 text-center text-text-muted uppercase text-[10px] font-bold">{d.diaSemana}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        d.status === 'NORMAL' ? 'bg-emerald-500/15 text-emerald-400' :
                        d.status === 'ATRASO' ? 'bg-amber-500/15 text-amber-400' :
                        d.status === 'FALTA' ? 'bg-rose-500/15 text-rose-400' :
                        d.status === 'AUSENCIA' ? 'bg-blue-500/15 text-blue-400' :
                        d.status === 'FERIADO' ? 'bg-purple-500/15 text-purple-400' :
                        d.status === 'FOLGA' ? 'bg-slate-500/15 text-slate-400' :
                        'bg-elevated-solid text-text-faint'
                      }`}>{d.status}</span>
                    </td>
                    <td className="p-3 font-mono text-xs text-text-secondary">
                      {d.batidas?.length > 0 ? d.batidas.join(' · ') : <span className="text-text-faint">—</span>}
                    </td>
                    <td className="p-3 text-center font-mono text-xs text-text-primary">
                      {Math.floor(d.minutosTrabalhados / 60)}h{String(d.minutosTrabalhados % 60).padStart(2, '0')}
                    </td>
                    <td className="p-3 text-center font-mono text-xs text-text-muted">
                      {Math.floor(d.metaMinutos / 60)}h{String(d.metaMinutos % 60).padStart(2, '0')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
