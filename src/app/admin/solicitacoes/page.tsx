'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Check, X, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SolicitacoesAjuste() {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para edição do admin
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
    try {
      await axios.post('/api/admin/solicitacoes', { 
        id, 
        acao,
        novoHorarioFinal: horarioFinal // Se o admin editou, manda esse
      });
      alert(acao === 'APROVAR' ? 'Ajuste realizado!' : 'Solicitação rejeitada.');
      carregar();
      setEditandoId(null);
    } catch (e) { alert('Erro ao processar.'); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-bold text-purple-400">Solicitações de Ajuste</h1>
          <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft size={20} /> Voltar</Link>
        </div>

        {loading ? <p>Carregando...</p> : solicitacoes.length === 0 ? (
          <div className="text-center py-10 bg-slate-900 rounded-xl border border-slate-800">
            <p className="text-slate-500">Nenhuma solicitação pendente. 🎉</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {solicitacoes.map((sol) => (
              <div key={sol.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-6 items-start md:items-center">
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs font-bold uppercase">{sol.usuario.nome}</span>
                    <span className="text-slate-500 text-xs">{format(new Date(sol.criadoEm), "dd/MM 'às' HH:mm")}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-slate-400">
                      <p className="text-[10px] uppercase">Batido às</p>
                      <p className="font-mono text-red-400 line-through decoration-red-500/50">{format(new Date(sol.ponto.dataHora), 'HH:mm')}</p>
                    </div>
                    <div className="text-slate-400">➡️</div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Solicitado</p>
                      {editandoId === sol.id ? (
                        <input 
                          type="time" 
                          value={horarioAdmin} 
                          onChange={e => setHorarioAdmin(e.target.value)}
                          className="bg-slate-800 border border-purple-500 rounded px-2 py-1 text-white font-bold"
                        />
                      ) : (
                        <p className="font-mono text-green-400 font-bold text-lg">{format(new Date(sol.novoHorario), 'HH:mm')}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded border border-slate-800 mt-2">
                    <p className="text-xs text-slate-500 italic">" {sol.motivo} "</p>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  {editandoId === sol.id ? (
                    <>
                      <button 
                        onClick={() => {
                            // Constrói a data completa com o novo horário do admin
                            const dataBase = format(new Date(sol.novoHorario), 'yyyy-MM-dd');
                            const final = new Date(`${dataBase}T${horarioAdmin}:00`).toISOString();
                            responder(sol.id, 'APROVAR', final);
                        }} 
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
                      >
                        Confirmar Edição
                      </button>
                      <button onClick={() => setEditandoId(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => responder(sol.id, 'APROVAR')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                        <Check size={16} /> Aceitar
                      </button>
                      
                      <button 
                        onClick={() => {
                            setEditandoId(sol.id);
                            setHorarioAdmin(format(new Date(sol.novoHorario), 'HH:mm'));
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                      >
                        <Clock size={16} /> Editar Horário
                      </button>

                      <button onClick={() => responder(sol.id, 'REJEITAR')} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-red-900">
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