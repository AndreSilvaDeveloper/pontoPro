'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Store, Plus, Check, ChevronDown, X, Loader2, Building2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface SeletorLojaProps {
    empresaAtualId?: string;
    empresaAtualNome: string;
}

export default function SeletorLoja({ empresaAtualId, empresaAtualNome }: SeletorLojaProps) {
  const [lojas, setLojas] = useState<any[]>([]);
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [loadingTroca, setLoadingTroca] = useState(false);
  const [novoNome, setNovoNome] = useState('');

  // Estados de Exclusão
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  
  // Função para buscar as lojas da API
  const carregarLojas = () => {
    axios.get('/api/admin/trocar-loja')
      .then(res => setLojas(res.data))
      .catch(err => console.error("Erro ao carregar lojas", err));
  };

  useEffect(() => {
    carregarLojas();
  }, []);

  // === FUNÇÃO ANTIGA (MANTIDA) ===
  const trocarLoja = async (id: string) => {
    if (id === empresaAtualId) return;
    setLoadingTroca(true);
    try {
        await axios.post('/api/admin/trocar-loja', { empresaId: id });
        window.location.href = '/admin'; // Força refresh total para carregar o contexto da nova loja
    } catch (e) { 
        toast.error('Erro ao trocar de loja.');
        setLoadingTroca(false);
    }
  };

  // === FUNÇÃO ANTIGA (MANTIDA) ===
  const criarNovaLoja = async () => {
      if(!novoNome.trim()) return;
      try {
          await axios.post('/api/admin/nova-loja', { nome: novoNome });
          toast.success("Filial criada com sucesso!");
          setNovoNome('');
          setCriando(false);
          carregarLojas(); 
      } catch (error) { 
          toast.error('Erro ao criar loja.'); 
      }
  };

  // === FUNÇÃO NOVA (EXCLUIR) ===
  const excluirLoja = async (id: string) => {
      setLoadingDelete(true);
      try {
          await axios.delete('/api/admin/excluir-loja', { data: { id } });
          toast.success("Loja excluída.");
          setDeletandoId(null);
          // Remove da lista localmente para ser instantâneo
          setLojas(atual => atual.filter(l => l.id !== id));
      } catch (error: any) {
          toast.error(error.response?.data?.erro || 'Erro ao excluir.');
      } finally {
          setLoadingDelete(false);
      }
  };

  return (
    <>
      {/* === BOTÃO PRINCIPAL === */}
      <button 
        onClick={() => !loadingTroca && setAberto(true)} 
        disabled={loadingTroca}
        className="group relative flex items-center gap-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all w-full md:w-auto min-w-[200px]"
      >
        <div className="bg-purple-900/30 p-2 rounded-lg text-purple-400">
             {loadingTroca ? <Loader2 size={18} className="animate-spin" /> : <Store size={18} />}
        </div>
        
        <div className="text-left flex-1 overflow-hidden">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Unidade Atual</p>
            <p className="font-bold text-white text-sm truncate">{empresaAtualNome || 'Carregando...'}</p>
        </div>

        <ChevronDown size={16} className="text-slate-500"/>
      </button>

      {/* === MODAL === */}
      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAberto(false)} />

            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Store size={18} className="text-purple-500"/> Selecionar Unidade
                    </h3>
                    <button onClick={() => setAberto(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Lista de Lojas */}
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {lojas.map(loja => {
                        // LÓGICA DE PROTEÇÃO: Verifica ID ou Nome para saber se é a ativa
                        const isAtiva = (loja.id === empresaAtualId) || (loja.nome === empresaAtualNome);
                        const isDeleting = deletandoId === loja.id;

                        if (isDeleting) {
                            return (
                                <div key={loja.id} className="p-3 bg-red-900/20 border border-red-900/50 rounded-xl flex flex-col gap-2 animate-in fade-in">
                                    <p className="text-xs text-red-200 flex items-center gap-2">
                                        <AlertTriangle size={14}/> Apagar <strong>{loja.nome}</strong>?
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            disabled={loadingDelete}
                                            onClick={() => setDeletandoId(null)} 
                                            className="flex-1 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            disabled={loadingDelete}
                                            onClick={() => excluirLoja(loja.id)} 
                                            className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 flex items-center justify-center gap-1"
                                        >
                                            {loadingDelete ? <Loader2 size={12} className="animate-spin"/> : 'Confirmar'}
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={loja.id} className="group flex items-center gap-2">
                                {/* Botão de Trocar */}
                                <button 
                                    onClick={() => trocarLoja(loja.id)}
                                    className={`flex-1 flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${isAtiva ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20 cursor-default' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    <span className="flex items-center gap-3">
                                        <Building2 size={16} className={isAtiva ? 'text-purple-200' : 'text-slate-500'} />
                                        {loja.nome}
                                    </span>
                                    {isAtiva && <Check size={16} />}
                                </button>
                                
                                {/* Botão Excluir (Só aparece se NÃO for a ativa) */}
                                {!isAtiva && (
                                    <button 
                                        onClick={() => setDeletandoId(loja.id)}
                                        className="p-3 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-colors"
                                        title="Excluir Filial"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Footer (Criar Nova) */}
                <div className="p-4 bg-slate-950/30 border-t border-slate-800">
                    {!criando ? (
                        <button onClick={() => setCriando(true)} className="w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-400 hover:bg-slate-800 transition-all text-sm font-bold flex items-center justify-center gap-2">
                            <Plus size={16} /> Cadastrar Nova Filial
                        </button>
                    ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <input 
                                autoFocus 
                                type="text" 
                                placeholder="Nome da nova loja..." 
                                value={novoNome} 
                                onChange={e => setNovoNome(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500" 
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setCriando(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700">Cancelar</button>
                                <button onClick={criarNovaLoja} disabled={!novoNome.trim()} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50">Confirmar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </>
  );
}