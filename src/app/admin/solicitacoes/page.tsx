'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Check, X, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SolicitacoesAjuste() {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [horarioAdmin, setHorarioAdmin] = useState('');

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
              <div key={sol.id} className="bg-surface backdrop-blur-sm p-6 rounded-2xl border border-border-subtle flex flex-col md:flex-row gap-6 items-start md:items-center">

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
      </div>
    </div>
  );
}
