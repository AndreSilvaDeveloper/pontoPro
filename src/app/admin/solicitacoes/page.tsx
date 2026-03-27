'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Check, X, Clock, ArrowLeft, AlertCircle, CheckSquare, Square, Timer } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function formatMinToHM(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function getMetaFromJornada(jornada: any, dataStr: string): number {
  if (!jornada) return 0;
  const date = new Date(dataStr + 'T12:00:00');
  const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const dia = diasMap[date.getDay()];
  const config = jornada[dia];
  if (!config || !config.ativo) return 0;

  const parseHM = (h: string) => {
    if (!h || !/^\d{2}:\d{2}$/.test(h)) return 0;
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };

  const hasS1 = config.s1 && /^\d{2}:\d{2}$/.test(config.s1);
  const hasE2 = config.e2 && /^\d{2}:\d{2}$/.test(config.e2);

  if (!hasS1 && !hasE2) {
    return Math.max(0, parseHM(config.s2) - parseHM(config.e1));
  }

  return Math.max(0, parseHM(config.s1) - parseHM(config.e1)) + Math.max(0, parseHM(config.s2) - parseHM(config.e2));
}

type Aba = 'ajustes' | 'horas-extras';

export default function SolicitacoesAjuste() {
  const [aba, setAba] = useState<Aba>('ajustes');

  // === AJUSTES ===
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loadingSol, setLoadingSol] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [horarioAdmin, setHorarioAdmin] = useState('');

  // === HORAS EXTRAS ===
  const [horasExtras, setHorasExtras] = useState<any[]>([]);
  const [loadingHE, setLoadingHE] = useState(true);

  // === COMUM ===
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processandoLote, setProcessandoLote] = useState(false);
  const [progressoLote, setProgressoLote] = useState(0);

  useEffect(() => { carregarSolicitacoes(); carregarHorasExtras(); }, []);

  // Limpar seleção ao trocar de aba
  useEffect(() => { setSelecionados(new Set()); }, [aba]);

  const carregarSolicitacoes = async () => {
    try {
      const res = await axios.get('/api/admin/solicitacoes');
      setSolicitacoes(res.data);
    } catch (e) { console.error("Erro"); } finally { setLoadingSol(false); }
  };

  const carregarHorasExtras = async () => {
    try {
      const res = await axios.get('/api/admin/horas-extras?status=PENDENTE');
      setHorasExtras(res.data);
    } catch (e) { console.error("Erro"); } finally { setLoadingHE(false); }
  };

  const responderSolicitacao = async (id: string, acao: 'APROVAR' | 'REJEITAR', horarioFinal?: string) => {
    setProcessando(id);
    try {
      await axios.post('/api/admin/solicitacoes', {
        id,
        acao,
        novoHorarioFinal: horarioFinal
      });
      toast.success(acao === 'APROVAR' ? 'Ajuste realizado!' : 'Solicitação rejeitada.');
      carregarSolicitacoes();
      setEditandoId(null);
    } catch (e) {
      toast.error('Erro ao processar.');
    } finally {
      setProcessando(null);
    }
  };

  const responderHoraExtra = async (id: string, acao: 'APROVAR' | 'REJEITAR') => {
    setProcessando(id);
    try {
      await axios.post('/api/admin/horas-extras', { id, acao });
      toast.success(acao === 'APROVAR' ? 'Hora extra aprovada!' : 'Hora extra rejeitada.');
      carregarHorasExtras();
    } catch (e) {
      toast.error('Erro ao processar.');
    } finally {
      setProcessando(null);
    }
  };

  const listaAtual = aba === 'ajustes' ? solicitacoes : horasExtras;
  const loading = aba === 'ajustes' ? loadingSol : loadingHE;

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === listaAtual.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(listaAtual.map(s => s.id)));
    }
  };

  const processarLote = async (acao: 'APROVAR' | 'REJEITAR') => {
    const ids = Array.from(selecionados);
    const endpoint = aba === 'ajustes' ? '/api/admin/solicitacoes' : '/api/admin/horas-extras';
    setProcessandoLote(true);
    setProgressoLote(0);
    let sucesso = 0;
    let erros = 0;

    for (let i = 0; i < ids.length; i++) {
      try {
        await axios.post(endpoint, { id: ids[i], acao });
        sucesso++;
      } catch {
        erros++;
      }
      setProgressoLote(i + 1);
    }

    setProcessandoLote(false);
    setProgressoLote(0);
    setSelecionados(new Set());

    if (aba === 'ajustes') carregarSolicitacoes();
    else carregarHorasExtras();

    const label = aba === 'ajustes' ? 'solicitação(ões)' : 'hora(s) extra(s)';
    if (erros === 0) {
      toast.success(`${sucesso} ${label} ${acao === 'APROVAR' ? 'aprovada(s)' : 'rejeitada(s)'} com sucesso!`);
    } else {
      toast.warning(`${sucesso} processada(s), ${erros} com erro.`);
    }
  };

  const formatarData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Orbs decorativos */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto p-4 md:p-8 pb-8 space-y-6 relative z-10">

        {/* CABEÇALHO */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <AlertCircle size={24} className="text-purple-400" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Pendências</h1>
          </div>
          {listaAtual.length > 0 && (
            <button
              onClick={toggleTodos}
              className="flex items-center gap-2 px-3 py-2 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95 text-xs font-bold"
            >
              {selecionados.size === listaAtual.length ? <CheckSquare size={18} className="text-purple-400" /> : <Square size={18} className="text-text-muted" />}
              {selecionados.size === listaAtual.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          )}
        </div>

        {/* ABAS */}
        <div className="flex gap-2 bg-page backdrop-blur-sm p-1.5 rounded-2xl border border-border-subtle">
          <button
            onClick={() => setAba('ajustes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              aba === 'ajustes'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-text-muted hover:text-text-primary hover:bg-hover-bg border border-transparent'
            }`}
          >
            <AlertCircle size={16} />
            Ajustes
            {solicitacoes.length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                {solicitacoes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAba('horas-extras')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              aba === 'horas-extras'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'text-text-muted hover:text-text-primary hover:bg-hover-bg border border-transparent'
            }`}
          >
            <Timer size={16} />
            Horas Extras
            {horasExtras.length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                {horasExtras.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTEÚDO */}
        {loading ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-hover-bg rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : listaAtual.length === 0 ? (
          <div className="text-center py-10 bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-text-faint">
              {aba === 'ajustes' ? 'Nenhuma solicitação pendente.' : 'Nenhuma hora extra pendente.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>

            {/* === ABA AJUSTES === */}
            {aba === 'ajustes' && solicitacoes.map((sol) => (
              <div key={sol.id} className={`bg-surface backdrop-blur-sm p-6 rounded-2xl border flex flex-col md:flex-row gap-6 items-start md:items-center transition-all hover:shadow-md ${selecionados.has(sol.id) ? 'border-purple-500/60 bg-purple-500/5' : 'border-border-subtle hover:border-border-default'}`}>

                <button
                  onClick={() => toggleSelecionado(sol.id)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-hover-bg transition-colors active:scale-95"
                  disabled={processandoLote}
                >
                  {selecionados.has(sol.id) ? <CheckSquare size={22} className="text-purple-400" /> : <Square size={22} className="text-text-muted" />}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-lg text-xs font-bold uppercase">{sol.usuario.nome}</span>
                    {!sol.pontoId ? (
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase">NOVO PONTO</span>
                    ) : (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase">AJUSTE</span>
                    )}
                    <span className="text-[10px] text-text-dim font-mono ml-auto">
                      Solicitado em {format(new Date(sol.criadoEm), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div>
                      <p className="text-[10px] uppercase text-text-muted">Dia do ponto</p>
                      <p className="font-mono text-text-primary font-bold">{format(new Date(sol.novoHorario), 'dd/MM/yyyy')}</p>
                    </div>

                    {sol.ponto && (
                      <>
                        <div className="text-text-muted">
                          <p className="text-[10px] uppercase">Original</p>
                          <p className="font-mono text-red-400 line-through decoration-red-500/50">{format(new Date(sol.ponto.dataHora), 'HH:mm')}</p>
                        </div>
                        <div className="text-text-muted">→</div>
                      </>
                    )}

                    <div>
                      <p className="text-[10px] uppercase text-text-muted">Novo horário ({sol.tipo || sol.ponto?.tipo})</p>
                      {editandoId === sol.id ? (
                        <input type="time" value={horarioAdmin} onChange={e => setHorarioAdmin(e.target.value)} className="bg-page border border-purple-500 rounded-xl px-2 py-1 text-text-primary font-bold focus:border-purple-400 outline-none"/>
                      ) : (
                        <p className="font-mono text-emerald-400 font-bold text-lg">{format(new Date(sol.novoHorario), 'HH:mm')}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-page p-3 rounded-xl border border-border-subtle mt-2">
                    <p className="text-xs text-text-faint italic">&quot; {sol.motivo} &quot;</p>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  {editandoId === sol.id ? (
                    <>
                      <button
                        onClick={() => {
                          const dataBase = format(new Date(sol.novoHorario), 'yyyy-MM-dd');
                          const final = new Date(`${dataBase}T${horarioAdmin}:00`).toISOString();
                          responderSolicitacao(sol.id, 'APROVAR', final);
                        }}
                        disabled={!!processando}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                      >
                        Confirmar Edição
                      </button>
                      <button onClick={() => setEditandoId(null)} className="bg-hover-bg hover:bg-hover-bg-strong text-text-primary px-4 py-2 rounded-xl text-xs font-bold transition-colors">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => responderSolicitacao(sol.id, 'APROVAR')} disabled={!!processando} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                        <Check size={16} /> Aceitar
                      </button>

                      <button
                        onClick={() => {
                          setEditandoId(sol.id);
                          setHorarioAdmin(format(new Date(sol.novoHorario), 'HH:mm'));
                        }}
                        disabled={!!processando}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Clock size={16} /> Editar Horário
                      </button>

                      <button onClick={() => responderSolicitacao(sol.id, 'REJEITAR')} disabled={!!processando} className="bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-red-900/50 transition-colors">
                        <X size={16} /> Rejeitar
                      </button>
                    </>
                  )}
                </div>

              </div>
            ))}

            {/* === ABA HORAS EXTRAS === */}
            {aba === 'horas-extras' && horasExtras.map((item) => {
              const meta = getMetaFromJornada(item.usuario?.jornada, item.data);
              const trabalhado = meta + item.minutosExtra;

              return (
                <div key={item.id} className={`bg-surface backdrop-blur-sm p-6 rounded-2xl border flex flex-col md:flex-row gap-6 items-start md:items-center transition-all hover:shadow-md ${selecionados.has(item.id) ? 'border-purple-500/60 bg-purple-500/5' : 'border-border-subtle hover:border-border-default'}`}>

                  <button
                    onClick={() => toggleSelecionado(item.id)}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-hover-bg transition-colors active:scale-95"
                    disabled={processandoLote}
                  >
                    {selecionados.has(item.id) ? <CheckSquare size={22} className="text-purple-400" /> : <Square size={22} className="text-text-muted" />}
                  </button>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-lg text-xs font-bold uppercase">{item.usuario?.nome}</span>
                      <span className="bg-orange-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase">HORA EXTRA</span>
                    </div>

                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <div>
                        <p className="text-[10px] uppercase text-text-muted">Data</p>
                        <p className="font-mono text-text-primary font-bold">{formatarData(item.data)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-text-muted">Meta</p>
                        <p className="font-mono text-text-secondary">{formatMinToHM(meta)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-text-muted">Trabalhado</p>
                        <p className="font-mono text-text-secondary">{formatMinToHM(trabalhado)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-text-muted">Extra</p>
                        <p className="font-mono text-orange-400 font-bold text-lg">+{formatMinToHM(item.minutosExtra)}</p>
                      </div>
                    </div>
                  </div>

                  {/* BOTÕES */}
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <button
                      onClick={() => responderHoraExtra(item.id, 'APROVAR')}
                      disabled={!!processando}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check size={16} /> Aprovar
                    </button>
                    <button
                      onClick={() => responderHoraExtra(item.id, 'REJEITAR')}
                      disabled={!!processando}
                      className="bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-red-900/50 transition-colors"
                    >
                      <X size={16} /> Rejeitar
                    </button>
                  </div>

                </div>
              );
            })}

          </div>
        )}
        {/* Espaço extra quando a barra de ações em lote está visível */}
        {selecionados.size > 0 && <div className="h-24" />}
      </div>

      {/* BARRA DE AÇÕES EM LOTE */}
      {selecionados.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-border-subtle p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-text-muted font-medium">
              {processandoLote
                ? `Processando ${progressoLote}/${selecionados.size}...`
                : `${selecionados.size} item(ns) selecionado(s)`}
            </span>

            {processandoLote ? (
              <div className="flex items-center gap-3">
                <div className="w-40 h-2 bg-hover-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${(progressoLote / selecionados.size) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => processarLote('APROVAR')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors active:scale-95"
                >
                  <Check size={16} /> Aprovar Selecionados
                </button>
                <button
                  onClick={() => processarLote('REJEITAR')}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors active:scale-95"
                >
                  <X size={16} /> Rejeitar Selecionados
                </button>
                <button
                  onClick={() => setSelecionados(new Set())}
                  className="bg-hover-bg hover:bg-hover-bg-strong text-text-primary px-4 py-2 rounded-xl text-xs font-bold transition-colors active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
