'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Wallet, ArrowLeft, ChevronLeft, ChevronRight, Search, Plus, X, Loader2,
  Save, Check, CircleDollarSign, Receipt, TrendingDown, TrendingUp as TrendUp,
  Calendar, AlertCircle, Edit3, Trash2, Sparkles, Printer,
} from 'lucide-react';

type Provento = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  parcelaAtual: number;
  parcelaTotal: number;
};

type Desconto = {
  id: string;
  tipo: string;
  descricao: string;
  valorOriginal: number;
  percentualDesconto: number | null;
  valorFinal: number;
  parcelaAtual: number;
  parcelaTotal: number;
};

type FolhaInline = {
  id: string;
  status: 'RASCUNHO' | 'FECHADA' | 'ASSINADA' | 'RECUSADA' | 'PAGA';
  fechadaEm: string | null;
  pagaEm: string | null;
  comprovanteUrl: string | null;
  observacao: string | null;
} | null;

type Linha = {
  funcionario: { id: string; nome: string; fotoPerfilUrl: string | null };
  salarioBase: number;
  proventos: Provento[];
  descontos: Desconto[];
  totalProventos: number;
  totalDescontos: number;
  salarioBruto: number; // = totalProventos
  valorLiquido: number;
  folha: FolhaInline;
};

type Totais = { bruto: number; descontos: number; liquido: number };

type Natureza = 'PROVENTO' | 'DESCONTO';

const TIPOS_PROVENTO = [
  { id: 'SALARIO',           label: 'Salário' },
  { id: 'PERICULOSIDADE',    label: 'Periculosidade' },
  { id: 'ADICIONAL_NOTURNO', label: 'Adicional noturno' },
  { id: 'HORA_EXTRA',        label: 'Hora extra' },
  { id: 'COMISSAO',          label: 'Comissão' },
  { id: 'BONUS',             label: 'Bônus' },
  { id: 'OUTROS',            label: 'Outros' },
];

const TIPOS_DESCONTO = [
  { id: 'COMPRA',       label: 'Compra na empresa' },
  { id: 'ADIANTAMENTO', label: 'Adiantamento' },
  { id: 'VALE',         label: 'Vale' },
  { id: 'EMPRESTIMO',   label: 'Empréstimo' },
  { id: 'OUTROS',       label: 'Outros (INSS, FGTS...)' },
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  RASCUNHO: { label: 'Rascunho',  cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  FECHADA:  { label: 'Aguardando', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  ASSINADA: { label: 'Assinada',  cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  RECUSADA: { label: 'Contestada', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  PAGA:     { label: 'Paga',      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
};

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function brlInput(v: number) {
  return v.toFixed(2).replace('.', ',');
}
function parseBRL(s: string): number {
  const n = Number(String(s).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export default function FinanceiroPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [totais, setTotais] = useState<Totais>({ bruto: 0, descontos: 0, liquido: 0 });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [salarioEditandoId, setSalarioEditandoId] = useState<string | null>(null);
  const [salarioEditValor, setSalarioEditValor] = useState('');
  const [salvandoSalario, setSalvandoSalario] = useState(false);
  const [lancarModal, setLancarModal] = useState<{ funcionarioId: string; nome: string; natureza: Natureza } | null>(null);
  const [detalheModal, setDetalheModal] = useState<Linha | null>(null);
  const [fechandoFolha, setFechandoFolha] = useState(false);
  const [pagandoFolhaId, setPagandoFolhaId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`/api/admin/financeiro/folha`, { params: { mes, ano } });
      setLinhas(r.data.linhas || []);
      setTotais(r.data.totais || { bruto: 0, descontos: 0, liquido: 0 });
    } catch {
      toast.error('Erro ao carregar folha.');
      setLinhas([]);
      setTotais({ bruto: 0, descontos: 0, liquido: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mes, ano]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter(l => l.funcionario.nome.toLowerCase().includes(q));
  }, [linhas, busca]);

  const navegarMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
  };

  const iniciarEdicaoSalario = (linha: Linha) => {
    setSalarioEditandoId(linha.funcionario.id);
    setSalarioEditValor(linha.salarioBase > 0 ? brlInput(linha.salarioBase) : '');
  };

  const salvarSalario = async () => {
    if (!salarioEditandoId) return;
    setSalvandoSalario(true);
    try {
      const valor = salarioEditValor.trim() === '' ? null : parseBRL(salarioEditValor);
      await axios.put('/api/admin/financeiro/salario', { funcionarioId: salarioEditandoId, salarioBase: valor });
      toast.success('Salário base atualizado.');
      setSalarioEditandoId(null);
      await carregar();
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || 'Erro ao salvar.');
    } finally {
      setSalvandoSalario(false);
    }
  };

  const usarSalarioBaseComoProvento = async (linha: Linha) => {
    if (linha.salarioBase <= 0) {
      toast.error('Defina o salário base primeiro.');
      return;
    }
    if (!confirm(`Lançar R$ ${linha.salarioBase.toFixed(2)} como provento "Salário" de ${linha.funcionario.nome} no mês ${String(mes).padStart(2,'0')}/${ano}?`)) return;
    try {
      await axios.post('/api/admin/financeiro/proventos', {
        funcionarioId: linha.funcionario.id,
        tipo: 'SALARIO',
        descricao: 'Salário',
        valor: linha.salarioBase,
        mesReferencia: mes,
        anoReferencia: ano,
        parcelas: 1,
      });
      toast.success('Salário lançado como provento do mês.');
      await carregar();
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || 'Erro ao lançar.');
    }
  };

  const fecharFolha = async () => {
    if (!confirm(`Fechar a folha de ${MESES[mes - 1]}/${ano}?\n\nIsso cria um snapshot pra cada funcionário com lançamentos e dispara push pra eles.`)) return;
    setFechandoFolha(true);
    try {
      const r = await axios.post('/api/admin/financeiro/folha', { mes, ano });
      toast.success(`Folha fechada: ${r.data.criadas} criadas, ${r.data.atualizadas} atualizadas, ${r.data.ignoradas} ignoradas.`);
      await carregar();
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || 'Erro ao fechar folha.');
    } finally {
      setFechandoFolha(false);
    }
  };

  const marcarPaga = async (folhaId: string) => {
    setPagandoFolhaId(folhaId);
    try {
      await axios.patch('/api/admin/financeiro/folha', { folhaId });
      toast.success('Folha marcada como paga.');
      await carregar();
    } catch {
      toast.error('Erro ao marcar como paga.');
    } finally {
      setPagandoFolhaId(null);
    }
  };

  const excluirFolha = async (folhaId: string, nome: string) => {
    if (!confirm(`Excluir o fechamento de ${nome}?\n\nA folha volta pro estado "não fechada". Os proventos e descontos lançados permanecem — só o snapshot do fechamento é removido.`)) return;
    try {
      await axios.delete(`/api/admin/financeiro/folha/${folhaId}`);
      toast.success('Fechamento excluído.');
      await carregar();
    } catch {
      toast.error('Erro ao excluir fechamento.');
    }
  };

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

      <header className="sticky top-0 z-10 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 flex-wrap">
          <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
            <ArrowLeft size={18} />
          </Link>
          <div className="bg-emerald-500/15 p-2 rounded-xl border border-emerald-500/20">
            <Wallet size={22} className="text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold tracking-tight">Folha de pagamento</h1>
            <p className="text-text-muted text-[11px]">Lance proventos e descontos do mês. O bruto é a soma dos proventos.</p>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => navegarMes(-1)} className="p-2 hover:bg-hover-bg rounded-xl text-text-muted transition-colors" title="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <div className="min-w-[140px] text-center px-3 py-2 bg-elevated rounded-xl border border-border-subtle text-sm font-bold">
              {MESES[mes - 1]} <span className="text-text-muted font-normal">{ano}</span>
            </div>
            <button onClick={() => navegarMes(1)} className="p-2 hover:bg-hover-bg rounded-xl text-text-muted transition-colors" title="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 relative z-10">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar funcionário…"
              className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border-subtle rounded-xl text-sm text-text-primary outline-none focus:border-emerald-500"
            />
          </div>
          <a
            href={`/financeiro/imprimir?mes=${mes}&ano=${ano}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-elevated hover:bg-elevated-solid border border-border-subtle text-text-secondary text-sm font-semibold transition-colors"
            title="Abrir versão pra imprimir/exportar PDF"
          >
            <Printer size={14} /> Imprimir / PDF
          </a>
          <button
            onClick={fecharFolha}
            disabled={fechandoFolha || loading || linhas.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {fechandoFolha ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Fechar folha do mês
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-emerald-400" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-border-subtle">
            <AlertCircle size={32} className="text-text-faint mx-auto mb-3" />
            <p className="text-text-muted text-sm">
              {linhas.length === 0
                ? 'Nenhum funcionário cadastrado nesta empresa.'
                : 'Nenhum funcionário corresponde à busca.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border-subtle overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(200px,1fr)_110px_110px_110px_110px_90px_220px] gap-3 px-4 py-3 border-b border-border-subtle text-[10px] uppercase tracking-wider text-text-dim font-bold">
              <div>Funcionário</div>
              <div className="text-right">Salário base <span className="text-text-faint normal-case">(ref.)</span></div>
              <div className="text-right">Proventos</div>
              <div className="text-right">Descontos</div>
              <div className="text-right">Líquido</div>
              <div>Status</div>
              <div>Ações</div>
            </div>

            <ul className="divide-y divide-border-subtle" id="lista-financeiro">
              {filtradas.map(linha => {
                const editandoSalario = salarioEditandoId === linha.funcionario.id;
                const semSalario = linha.salarioBase <= 0;
                const semLancamentos = linha.proventos.length === 0 && linha.descontos.length === 0;
                const temSalarioComoProvento = linha.proventos.some(p => p.tipo === 'SALARIO');
                const podeUsarSalarioBase = !semSalario && !temSalarioComoProvento;
                const statusFolha = linha.folha?.status;

                return (
                  <li key={linha.funcionario.id} className="px-4 py-3 hover:bg-hover-bg/40 transition-colors">
                    <div className="grid grid-cols-[1fr] md:grid-cols-[minmax(200px,1fr)_110px_110px_110px_110px_90px_220px] gap-3 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        {linha.funcionario.fotoPerfilUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={linha.funcionario.fotoPerfilUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-border-subtle shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-elevated border border-border-subtle flex items-center justify-center text-text-faint shrink-0 text-xs font-bold">
                            {linha.funcionario.nome.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{linha.funcionario.nome}</p>
                          <p className="text-[10px] text-text-faint md:hidden">
                            {semSalario ? <span className="text-amber-400">Sem salário base</span> : `Base ${brl(linha.salarioBase)}`}
                          </p>
                        </div>
                      </div>

                      {/* Salário base */}
                      <div className="hidden md:flex justify-end">
                        {editandoSalario ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={salarioEditValor}
                              onChange={e => setSalarioEditValor(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') salvarSalario(); if (e.key === 'Escape') setSalarioEditandoId(null); }}
                              placeholder="0,00"
                              className="w-24 bg-page border border-emerald-500/40 rounded-md px-2 py-1 text-sm text-right text-text-primary font-mono outline-none"
                              autoFocus
                            />
                            <button onClick={salvarSalario} disabled={salvandoSalario} className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-50">
                              {salvandoSalario ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setSalarioEditandoId(null)} className="p-1 rounded-md text-text-muted hover:bg-hover-bg">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => iniciarEdicaoSalario(linha)}
                            className={`inline-flex items-center gap-1 text-sm font-mono ${semSalario ? 'text-amber-400 italic' : 'text-text-muted'} hover:bg-hover-bg px-2 py-1 rounded-md transition-colors`}
                            title="Clique pra editar (referência, não usado direto na folha)"
                          >
                            {semSalario ? 'definir…' : brl(linha.salarioBase)}
                            <Edit3 size={12} className="opacity-60" />
                          </button>
                        )}
                      </div>

                      {/* Proventos */}
                      <div className="hidden md:flex justify-end">
                        {linha.proventos.length > 0 ? (
                          <button
                            onClick={() => setDetalheModal(linha)}
                            className="text-sm font-mono text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 px-2 py-1 rounded-md transition-colors"
                            title="Ver detalhamento"
                          >
                            +{brl(linha.totalProventos)}
                            <span className="ml-1 text-[10px] text-text-dim">({linha.proventos.length})</span>
                          </button>
                        ) : (
                          <span className="text-sm text-text-faint font-mono">—</span>
                        )}
                      </div>

                      {/* Descontos */}
                      <div className="hidden md:flex justify-end">
                        {linha.descontos.length > 0 ? (
                          <button
                            onClick={() => setDetalheModal(linha)}
                            className="text-sm font-mono text-red-300 hover:text-red-200 hover:bg-red-500/10 px-2 py-1 rounded-md transition-colors"
                          >
                            -{brl(linha.totalDescontos)}
                            <span className="ml-1 text-[10px] text-text-dim">({linha.descontos.length})</span>
                          </button>
                        ) : (
                          <span className="text-sm text-text-faint font-mono">—</span>
                        )}
                      </div>

                      {/* Líquido */}
                      <div className="hidden md:flex justify-end">
                        <span className={`text-sm font-mono font-bold ${linha.valorLiquido > 0 ? 'text-emerald-300' : 'text-text-faint'}`}>{brl(linha.valorLiquido)}</span>
                      </div>

                      {/* Status */}
                      <div className="hidden md:flex">
                        {statusFolha ? (
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${STATUS_BADGE[statusFolha].cls}`}>
                            {STATUS_BADGE[statusFolha].label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-faint italic">não fechada</span>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        <button
                          onClick={() => setLancarModal({ funcionarioId: linha.funcionario.id, nome: linha.funcionario.nome, natureza: 'PROVENTO' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                          title="Lançar provento (crédito)"
                        >
                          <TrendUp size={12} /> Provento
                        </button>
                        <button
                          onClick={() => setLancarModal({ funcionarioId: linha.funcionario.id, nome: linha.funcionario.nome, natureza: 'DESCONTO' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors"
                          title="Lançar desconto (débito)"
                        >
                          <TrendingDown size={12} /> Desconto
                        </button>
                        {podeUsarSalarioBase && (
                          <button
                            onClick={() => usarSalarioBaseComoProvento(linha)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
                            title={`Lançar R$ ${linha.salarioBase.toFixed(2)} como provento "Salário"`}
                          >
                            <Sparkles size={12} /> Usar base
                          </button>
                        )}
                        {(linha.proventos.length > 0 || linha.descontos.length > 0) && (
                          <button
                            onClick={() => setDetalheModal(linha)}
                            className="md:hidden inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors"
                          >
                            Ver
                          </button>
                        )}
                        {(statusFolha === 'FECHADA' || statusFolha === 'ASSINADA' || statusFolha === 'RECUSADA') && linha.folha && (
                          <button
                            onClick={() => linha.folha && marcarPaga(linha.folha.id)}
                            disabled={pagandoFolhaId === linha.folha.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            title="Marcar como paga"
                          >
                            {pagandoFolhaId === linha.folha.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Pagar
                          </button>
                        )}
                        {(linha.proventos.length > 0 || linha.descontos.length > 0 || statusFolha) && (
                          <a
                            href={`/financeiro/imprimir?mes=${mes}&ano=${ano}&funcionarioId=${linha.funcionario.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-500/10 border border-slate-500/20 text-slate-300 hover:bg-slate-500/20 transition-colors"
                            title="Contracheque pra imprimir/PDF"
                          >
                            <Printer size={12} /> PDF
                          </a>
                        )}
                        {statusFolha && linha.folha && (
                          <button
                            onClick={() => linha.folha && excluirFolha(linha.folha.id, linha.funcionario.nome)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition-colors"
                            title="Excluir o fechamento (volta pra não fechada)"
                          >
                            <Trash2 size={12} /> Excluir folha
                          </button>
                        )}
                      </div>

                      {/* Mobile resumo */}
                      <div className="md:hidden col-span-full flex items-center justify-between gap-3 mt-1 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          {linha.totalProventos > 0 && (
                            <span className="font-mono text-emerald-300">+{brl(linha.totalProventos)}</span>
                          )}
                          {linha.totalDescontos > 0 && (
                            <span className="font-mono text-red-300">-{brl(linha.totalDescontos)}</span>
                          )}
                          {semLancamentos && (
                            <span className="text-text-faint italic">sem lançamentos</span>
                          )}
                          {!semLancamentos && (
                            <>
                              <span className="text-text-faint">→</span>
                              <span className="font-mono font-bold text-emerald-300">{brl(linha.valorLiquido)}</span>
                            </>
                          )}
                          {statusFolha && (
                            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${STATUS_BADGE[statusFolha].cls}`}>
                              {STATUS_BADGE[statusFolha].label}
                            </span>
                          )}
                        </div>
                        {editandoSalario ? null : (
                          <button onClick={() => iniciarEdicaoSalario(linha)} className="text-xs text-purple-300 hover:text-purple-200 font-semibold">
                            {semSalario ? 'Salário base' : 'Editar base'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Totais do mês — rodapé da tabela */}
            <div className="hidden md:grid grid-cols-[minmax(200px,1fr)_110px_110px_110px_110px_90px_220px] gap-3 px-4 py-3 border-t border-border-default bg-elevated/40 items-center">
              <div className="text-[11px] uppercase font-bold text-text-dim tracking-wider">Totais do mês</div>
              <div></div>
              <div className="text-right text-sm font-mono font-bold text-emerald-300">+{brl(totais.bruto)}</div>
              <div className="text-right text-sm font-mono font-bold text-red-300">-{brl(totais.descontos)}</div>
              <div className="text-right text-sm font-mono font-bold text-emerald-300">{brl(totais.liquido)}</div>
              <div></div>
              <div></div>
            </div>
            <div className="md:hidden px-4 py-3 border-t border-border-default bg-elevated/40 flex items-center justify-between gap-3 text-xs">
              <span className="text-[11px] uppercase font-bold text-text-dim tracking-wider">Totais</span>
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <span className="font-mono text-emerald-300">+{brl(totais.bruto)}</span>
                <span className="font-mono text-red-300">-{brl(totais.descontos)}</span>
                <span className="font-mono font-bold text-emerald-200">{brl(totais.liquido)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {lancarModal && (
        <ModalLancarLancamento
          natureza={lancarModal.natureza}
          funcionarioId={lancarModal.funcionarioId}
          funcionarioNome={lancarModal.nome}
          mesAtual={mes}
          anoAtual={ano}
          onClose={() => setLancarModal(null)}
          onSalvo={() => { setLancarModal(null); carregar(); }}
        />
      )}

      {detalheModal && (
        <ModalDetalhe
          linha={detalheModal}
          mes={mes}
          ano={ano}
          onClose={() => setDetalheModal(null)}
          onMudou={carregar}
        />
      )}
    </div>
  );
}

function ModalLancarLancamento({
  natureza, funcionarioId, funcionarioNome, mesAtual, anoAtual, onClose, onSalvo,
}: {
  natureza: Natureza;
  funcionarioId: string;
  funcionarioNome: string;
  mesAtual: number;
  anoAtual: number;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const isProvento = natureza === 'PROVENTO';
  const tipos = isProvento ? TIPOS_PROVENTO : TIPOS_DESCONTO;
  const [tipo, setTipo] = useState(tipos[0].id);
  const [descricao, setDescricao] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [percDesconto, setPercDesconto] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [parcelasFixas, setParcelasFixas] = useState(false);
  const [mes, setMes] = useState(mesAtual);
  const [ano, setAno] = useState(anoAtual);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const valor = parseBRL(valorOriginal);
  const pct = isProvento ? 0 : parseBRL(percDesconto);
  // Valor base por parcela: fixo (valor cheio repetido) ou dividido entre as parcelas.
  const valorBasePorParcela = parcelasFixas
    ? valor
    : (parcelas > 0 ? valor / parcelas : 0);
  const valorFinalPorParcela = Math.round((valorBasePorParcela * (1 - pct / 100)) * 100) / 100;
  const totalFinal = valorFinalPorParcela * parcelas;

  const corPrincipal = isProvento ? 'emerald' : 'purple';

  const salvar = async () => {
    if (!descricao.trim()) { toast.error('Descreva o motivo do lançamento.'); return; }
    if (valor <= 0) { toast.error('Informe um valor maior que zero.'); return; }
    setSalvando(true);
    try {
      if (isProvento) {
        await axios.post('/api/admin/financeiro/proventos', {
          funcionarioId,
          tipo,
          descricao: descricao.trim(),
          valor,
          mesReferencia: mes,
          anoReferencia: ano,
          parcelas,
          parcelasFixas,
          observacao: observacao.trim() || undefined,
        });
      } else {
        await axios.post('/api/admin/financeiro/descontos', {
          funcionarioId,
          tipo,
          descricao: descricao.trim(),
          valorOriginal: valor,
          percentualDesconto: pct > 0 ? pct : null,
          mesReferencia: mes,
          anoReferencia: ano,
          parcelas,
          parcelasFixas,
          observacao: observacao.trim() || undefined,
        });
      }
      toast.success(parcelas > 1 ? `${parcelas} parcelas lançadas.` : `${isProvento ? 'Provento' : 'Desconto'} lançado.`);
      onSalvo();
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-page border border-border-default rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-page/95 backdrop-blur-xl border-b border-border-subtle px-5 py-4 flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isProvento ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
              {isProvento ? <TrendUp size={14} /> : <TrendingDown size={14} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-text-primary">
                Lançar {isProvento ? 'provento' : 'desconto'}
              </h2>
              <p className="text-[11px] text-text-muted truncate">{funcionarioNome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:bg-hover-bg"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Tipo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1.5">
              {tipos.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={`text-xs font-semibold px-2 py-2 rounded-lg border transition-colors ${
                    tipo === t.id
                      ? `bg-${corPrincipal}-500/15 border-${corPrincipal}-500/40 text-${corPrincipal}-200`
                      : 'bg-elevated border-border-subtle text-text-muted hover:bg-hover-bg'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Descrição *</label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder={isProvento ? 'Ex.: Adicional noturno de maio' : 'Ex.: INSS · Compra na empresa · etc.'}
              maxLength={120}
              className="w-full mt-1.5 bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-purple-500"
            />
          </div>

          <div className={`grid ${isProvento ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            <div>
              <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">
                Valor {parcelas > 1 ? 'total (será dividido)' : ''} *
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint text-sm">R$</span>
                <input
                  type="text"
                  value={valorOriginal}
                  onChange={e => setValorOriginal(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-page border border-border-input rounded-xl pl-9 pr-3 py-2.5 text-sm text-right text-text-primary font-mono outline-none focus:border-purple-500"
                />
              </div>
            </div>
            {!isProvento && (
              <div>
                <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Abatimento (opc.)</label>
                <div className="relative mt-1.5">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint text-sm">%</span>
                  <input
                    type="text"
                    value={percDesconto}
                    onChange={e => setPercDesconto(e.target.value)}
                    placeholder="0"
                    className="w-full bg-page border border-border-input rounded-xl px-3 pr-8 py-2.5 text-sm text-right text-text-primary font-mono outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Parcelas</label>
              <input
                type="number"
                min={1}
                max={60}
                value={parcelas}
                onChange={e => setParcelas(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                className="w-full mt-1.5 bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-center text-text-primary font-mono outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Mês inicial</label>
              <select
                value={mes}
                onChange={e => setMes(parseInt(e.target.value))}
                className="w-full mt-1.5 bg-page border border-border-input rounded-xl px-2 py-2.5 text-sm text-text-primary outline-none focus:border-purple-500"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Ano</label>
              <input
                type="number"
                min={2024}
                max={2099}
                value={ano}
                onChange={e => setAno(parseInt(e.target.value) || ano)}
                className="w-full mt-1.5 bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-center text-text-primary font-mono outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {parcelas > 1 && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Modo do valor nas parcelas</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setParcelasFixas(false)}
                  className={`text-xs font-semibold px-2 py-2 rounded-lg border transition-colors text-left ${
                    !parcelasFixas ? 'bg-purple-500/15 border-purple-500/40 text-purple-200' : 'bg-elevated border-border-subtle text-text-muted hover:bg-hover-bg'
                  }`}
                >
                  Dividir o total
                  <span className="block text-[10px] font-normal text-text-faint mt-0.5">{brl(valor)} ÷ {parcelas}</span>
                </button>
                <button
                  onClick={() => setParcelasFixas(true)}
                  className={`text-xs font-semibold px-2 py-2 rounded-lg border transition-colors text-left ${
                    parcelasFixas ? 'bg-purple-500/15 border-purple-500/40 text-purple-200' : 'bg-elevated border-border-subtle text-text-muted hover:bg-hover-bg'
                  }`}
                >
                  Valor fixo por parcela
                  <span className="block text-[10px] font-normal text-text-faint mt-0.5">{brl(valor)} × {parcelas}</span>
                </button>
              </div>
              <p className="text-[11px] text-text-muted bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <Calendar size={12} className="inline mr-1" /> Cria {parcelas} parcelas a partir de <b>{MESES[mes - 1]}/{ano}</b>, uma por mês. Você pode editar o valor de cada parcela depois.
              </p>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Observação interna (opc.)</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Anotação só visível pros admins"
              className="w-full mt-1.5 bg-page border border-border-input rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="bg-elevated/50 border border-border-subtle rounded-xl p-3 space-y-1 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Valor {parcelas > 1 ? '(por parcela)' : ''}:</span>
              <span className="font-mono">{brl(valorBasePorParcela)}</span>
            </div>
            {!isProvento && pct > 0 && (
              <div className="flex justify-between text-text-muted">
                <span>Abatimento ({pct}%):</span>
                <span className="font-mono text-emerald-400">- {brl(valorBasePorParcela * (pct / 100))}</span>
              </div>
            )}
            <div className={`flex justify-between font-bold pt-1 border-t border-border-subtle ${isProvento ? 'text-emerald-300' : 'text-text-primary'}`}>
              <span>{isProvento ? 'Crédito' : 'Vai descontar'} {parcelas > 1 ? '(por parcela)' : ''}:</span>
              <span className="font-mono">{isProvento ? '+' : ''}{brl(valorFinalPorParcela)}</span>
            </div>
            {parcelas > 1 && (
              <div className={`flex justify-between text-[11px] ${isProvento ? 'text-emerald-300' : 'text-red-300'}`}>
                <span>Total ({parcelas}x):</span>
                <span className="font-mono">{brl(totalFinal)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-page/95 backdrop-blur-xl border-t border-border-subtle p-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary">Cancelar</button>
          <button
            onClick={salvar}
            disabled={salvando}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 ${
              isProvento ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-purple-600 hover:bg-purple-500'
            }`}
          >
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Lançar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalhe({
  linha, mes, ano, onClose, onMudou,
}: {
  linha: Linha;
  mes: number;
  ano: number;
  onClose: () => void;
  onMudou: () => void;
}) {
  const [proventos, setProventos] = useState<Provento[]>(linha.proventos);
  const [descontos, setDescontos] = useState<Desconto[]>(linha.descontos);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const totalProventos = proventos.reduce((a, p) => a + p.valor, 0);
  const totalDescontos = descontos.reduce((a, d) => a + d.valorFinal, 0);
  const liquido = Math.max(0, totalProventos - totalDescontos);

  const iniciarEdicao = (id: string, valorAtual: number) => {
    setEditandoId(id);
    setEditValor(valorAtual.toFixed(2).replace('.', ','));
  };

  const salvarEdicao = async (natureza: Natureza, id: string) => {
    const novoValor = parseBRL(editValor);
    if (novoValor <= 0) { toast.error('Valor deve ser maior que zero.'); return; }
    setSalvando(true);
    try {
      if (natureza === 'PROVENTO') {
        const r = await axios.patch(`/api/admin/financeiro/proventos/${id}`, { valor: novoValor });
        setProventos(prev => prev.map(p => p.id === id ? { ...p, valor: r.data.valor } : p));
      } else {
        const r = await axios.patch(`/api/admin/financeiro/descontos/${id}`, { valorOriginal: novoValor });
        setDescontos(prev => prev.map(d => d.id === id
          ? { ...d, valorOriginal: r.data.valorOriginal, valorFinal: r.data.valorFinal }
          : d));
      }
      toast.success('Valor atualizado.');
      setEditandoId(null);
      onMudou();
    } catch (e: any) {
      toast.error(e?.response?.data?.erro || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (natureza: Natureza, id: string, lote: boolean) => {
    if (!confirm(lote ? 'Excluir todas as parcelas deste lote?' : `Excluir este ${natureza === 'PROVENTO' ? 'provento' : 'desconto'}?`)) return;
    const base = natureza === 'PROVENTO' ? 'proventos' : 'descontos';
    try {
      await axios.delete(`/api/admin/financeiro/${base}/${id}${lote ? '?lote=1' : ''}`);
      toast.success('Lançamento removido.');
      onMudou();
      if (lote) {
        // Lote afeta vários meses — fecha o modal pra recarregar limpo.
        onClose();
      } else if (natureza === 'PROVENTO') {
        setProventos(prev => prev.filter(p => p.id !== id));
      } else {
        setDescontos(prev => prev.filter(d => d.id !== id));
      }
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-page border border-border-default rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-page/95 backdrop-blur-xl border-b border-border-subtle px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-text-primary">Lançamentos do mês</h2>
            <p className="text-[11px] text-text-muted truncate">{linha.funcionario.nome} · {MESES[mes - 1]}/{ano}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:bg-hover-bg"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/20">
              <p className="text-[9px] uppercase font-bold text-emerald-300">Proventos</p>
              <p className="text-sm font-mono font-bold text-emerald-300">+{brl(totalProventos)}</p>
            </div>
            <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/20">
              <p className="text-[9px] uppercase font-bold text-red-300">Descontos</p>
              <p className="text-sm font-mono font-bold text-red-300">-{brl(totalDescontos)}</p>
            </div>
            <div className="bg-elevated/50 rounded-xl p-3 border border-border-subtle">
              <p className="text-[9px] uppercase font-bold text-text-dim">Líquido</p>
              <p className="text-sm font-mono font-bold text-text-primary">{brl(liquido)}</p>
            </div>
          </div>

          {/* Proventos */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider mb-2 flex items-center gap-1">
              <TrendUp size={12} /> Proventos
            </h3>
            {proventos.length === 0 ? (
              <p className="text-center text-text-faint text-xs italic py-3">Nenhum provento lançado neste mês.</p>
            ) : (
              <ul className="space-y-2">
                {proventos.map(p => (
                  <li key={p.id} className="bg-elevated/40 border border-border-subtle rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] uppercase font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 rounded px-1.5 py-0.5">
                            {p.tipo}
                          </span>
                          {p.parcelaTotal > 1 && (
                            <span className="text-[9px] uppercase font-bold text-amber-300 bg-amber-500/15 border border-amber-500/20 rounded px-1.5 py-0.5">
                              {p.parcelaAtual}/{p.parcelaTotal}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-text-primary mt-1">{p.descricao}</p>
                        {editandoId === p.id ? (
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="text-text-faint text-xs">R$</span>
                            <input
                              type="text"
                              value={editValor}
                              onChange={e => setEditValor(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') salvarEdicao('PROVENTO', p.id); if (e.key === 'Escape') setEditandoId(null); }}
                              className="w-24 bg-page border border-emerald-500/40 rounded-md px-2 py-1 text-xs text-right text-text-primary font-mono outline-none"
                              autoFocus
                            />
                            <button onClick={() => salvarEdicao('PROVENTO', p.id)} disabled={salvando} className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-50">
                              {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                            <button onClick={() => setEditandoId(null)} className="p-1 rounded-md text-text-muted hover:bg-hover-bg"><X size={12} /></button>
                          </div>
                        ) : (
                          <p className="text-[11px] font-mono font-bold text-emerald-300 mt-1">+{brl(p.valor)}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => iniciarEdicao(p.id, p.valor)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
                          title="Editar valor"
                        >
                          <Edit3 size={10} /> Editar
                        </button>
                        <button
                          onClick={() => excluir('PROVENTO', p.id, false)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors"
                          title="Excluir só esta parcela"
                        >
                          <Trash2 size={10} /> Excluir
                        </button>
                        {p.parcelaTotal > 1 && (
                          <button
                            onClick={() => excluir('PROVENTO', p.id, true)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-red-500/5 border border-red-500/15 text-red-300/80 hover:bg-red-500/15 transition-colors"
                          >
                            <Trash2 size={10} /> Todas
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Descontos */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-red-300 tracking-wider mb-2 flex items-center gap-1">
              <TrendingDown size={12} /> Descontos
            </h3>
            {descontos.length === 0 ? (
              <p className="text-center text-text-faint text-xs italic py-3">Nenhum desconto neste mês.</p>
            ) : (
              <ul className="space-y-2">
                {descontos.map(d => (
                  <li key={d.id} className="bg-elevated/40 border border-border-subtle rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] uppercase font-bold text-purple-300 bg-purple-500/15 border border-purple-500/20 rounded px-1.5 py-0.5">
                            {d.tipo}
                          </span>
                          {d.parcelaTotal > 1 && (
                            <span className="text-[9px] uppercase font-bold text-amber-300 bg-amber-500/15 border border-amber-500/20 rounded px-1.5 py-0.5">
                              {d.parcelaAtual}/{d.parcelaTotal}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-text-primary mt-1">{d.descricao}</p>
                        {editandoId === d.id ? (
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="text-text-faint text-xs">R$</span>
                            <input
                              type="text"
                              value={editValor}
                              onChange={e => setEditValor(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') salvarEdicao('DESCONTO', d.id); if (e.key === 'Escape') setEditandoId(null); }}
                              className="w-24 bg-page border border-red-500/40 rounded-md px-2 py-1 text-xs text-right text-text-primary font-mono outline-none"
                              autoFocus
                            />
                            <button onClick={() => salvarEdicao('DESCONTO', d.id)} disabled={salvando} className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-50">
                              {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                            <button onClick={() => setEditandoId(null)} className="p-1 rounded-md text-text-muted hover:bg-hover-bg"><X size={12} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                            <span className="font-mono">{brl(d.valorOriginal)}</span>
                            {d.percentualDesconto != null && d.percentualDesconto > 0 && (
                              <span className="text-emerald-400">-{d.percentualDesconto}%</span>
                            )}
                            <span>→</span>
                            <span className="font-mono font-bold text-red-300">-{brl(d.valorFinal)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => iniciarEdicao(d.id, d.valorOriginal)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
                          title="Editar valor"
                        >
                          <Edit3 size={10} /> Editar
                        </button>
                        <button
                          onClick={() => excluir('DESCONTO', d.id, false)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors"
                          title="Excluir só esta parcela"
                        >
                          <Trash2 size={10} /> Excluir
                        </button>
                        {d.parcelaTotal > 1 && (
                          <button
                            onClick={() => excluir('DESCONTO', d.id, true)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-red-500/5 border border-red-500/15 text-red-300/80 hover:bg-red-500/15 transition-colors"
                          >
                            <Trash2 size={10} /> Todas
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
