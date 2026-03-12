'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Check, X, Clock, ArrowLeft, AlertCircle, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SolicitacoesAjuste() {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [horarioAdmin, setHorarioAdmin] = useState('');

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processandoLote, setProcessandoLote] = useState(false);
  const [progressoLote, setProgressoLote] = useState(0);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    try {
      const res = await axios.get('/api/admin/solicitacoes');
      setSolicitacoes(res.data);
    } catch (e) { console.error("Erro"); } finally { setLoading(false); }
  };

  const responder = async (id: string, acao: 'APROVAR' | 'REJEITAR', horarioFinal?: string) => {
    setProcessando(id);
    try {
      await axios.post('/api/admin/solicitacoes', {
        id,
        acao,
        novoHorarioFinal: horarioFinal
      });
      toast.success(acao === 'APROVAR' ? 'Ajuste realizado!' : 'Solicitação rejeitada.');
      carregar();
      setEditandoId(null);
    } catch (e) {
      toast.error('Erro ao processar.');
    } finally {
      setProcessando(null);
    }
  };

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === solicitacoes.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(solicitacoes.map(s => s.id)));
    }
  };

  const processarLote = async (acao: 'APROVAR' | 'REJEITAR') => {
    const ids = Array.from(selecionados);
    setProcessandoLote(true);
    setProgressoLote(0);
    let sucesso = 0;
    let erros = 0;

    for (let i = 0; i < ids.length; i++) {
      try {
        await axios.post('/api/admin/solicitacoes', { id: ids[i], acao });
        sucesso++;
      } catch {
        erros++;
      }
      setProgressoLote(i + 1);
    }

    setProcessandoLote(false);
    setProgressoLote(0);
    setSelecionados(new Set());
    carregar();

    if (erros === 0) {
      toast.success(`${sucesso} solicitação(ões) ${acao === 'APROVAR' ? 'aprovada(s)' : 'rejeitada(s)'} com sucesso!`);
    } else {
      toast.warning(`${sucesso} processada(s), ${erros} com erro.`);
    }
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
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Solicitações de Ajuste</h1>
          </div>
          {solicitacoes.length > 0 && (
            <button
              onClick={toggleTodos}
              className="flex items-center gap-2 px-3 py-2 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95 text-xs font-bold"
            >
              {selecionados.size === solicitacoes.length ? <CheckSquare size={18} className="text-purple-400" /> : <Square size={18} className="text-text-muted" />}
              {selecionados.size === solicitacoes.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-text-muted">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            Carregando...
          </div>
        ) : solicitacoes.length === 0 ? (
          <div className="text-center py-10 bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-text-faint">Nenhuma solicitação pendente.</p>
          </div>
        ) : (
          <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
            {solicitacoes.map((sol) => (
              <div key={sol.id} className={`bg-surface backdrop-blur-sm p-6 rounded-2xl border flex flex-col md:flex-row gap-6 items-start md:items-center transition-colors ${selecionados.has(sol.id) ? 'border-purple-500/60 bg-purple-500/5' : 'border-border-subtle'}`}>

                <button
                  onClick={() => toggleSelecionado(sol.id)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-hover-bg transition-colors active:scale-95"
                  disabled={processandoLote}
                >
                  {selecionados.has(sol.id) ? <CheckSquare size={22} className="text-purple-400" /> : <Square size={22} className="text-text-muted" />}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-lg text-xs font-bold uppercase">{sol.usuario.nome}</span>
                    {!sol.pontoId ? (
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase">NOVO PONTO</span>
                    ) : (
                      <span className="bg-yellow-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase">AJUSTE</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    {sol.ponto ? (
                      <>
                        <div className="text-text-muted">
                          <p className="text-[10px] uppercase">Original</p>
                          <p className="font-mono text-red-400 line-through decoration-red-500/50">{format(new Date(sol.ponto.dataHora), 'HH:mm')}</p>
                        </div>
                        <div className="text-text-muted">➡️</div>
                      </>
                    ) : (
                      <div className="text-text-muted">
                        <p className="text-[10px] uppercase">Data</p>
                        <p className="font-mono text-text-primary">{format(new Date(sol.novoHorario), 'dd/MM/yyyy')}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] uppercase text-text-muted">Solicitado ({sol.tipo || sol.ponto?.tipo})</p>
                      {editandoId === sol.id ? (
                        <input type="time" value={horarioAdmin} onChange={e => setHorarioAdmin(e.target.value)} className="bg-input-solid/50 border border-purple-500 rounded-xl px-2 py-1 text-text-primary font-bold focus:border-purple-400 outline-none"/>
                      ) : (
                        <p className="font-mono text-green-400 font-bold text-lg">{format(new Date(sol.novoHorario), 'HH:mm')}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-input-solid/50 p-3 rounded-xl border border-border-subtle mt-2">
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
                          responder(sol.id, 'APROVAR', final);
                        }}
                        disabled={!!processando}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                      >
                        Confirmar Edição
                      </button>
                      <button onClick={() => setEditandoId(null)} className="bg-hover-bg hover:bg-hover-bg-strong text-text-primary px-4 py-2 rounded-xl text-xs font-bold transition-colors">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => responder(sol.id, 'APROVAR')} disabled={!!processando} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                        <Check size={16} /> Aceitar
                      </button>

                      <button
                        onClick={() => {
                          setEditandoId(sol.id);
                          setHorarioAdmin(format(new Date(sol.novoHorario), 'HH:mm'));
                        }}
                        disabled={!!processando}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Clock size={16} /> Editar Horário
                      </button>

                      <button onClick={() => responder(sol.id, 'REJEITAR')} disabled={!!processando} className="bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-red-900/50 transition-colors">
                        <X size={16} /> Rejeitar
                      </button>
                    </>
                  )}
                </div>

              </div>
            ))}
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
                : `${selecionados.size} solicitação(ões) selecionada(s)`}
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
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors active:scale-95"
                >
                  <Check size={16} /> Aprovar Selecionados
                </button>
                <button
                  onClick={() => processarLote('REJEITAR')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors active:scale-95"
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
