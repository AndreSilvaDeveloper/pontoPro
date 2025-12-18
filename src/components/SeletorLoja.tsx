'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Store, Plus, Check, ChevronDown, X, Loader2, Building2 } from 'lucide-react';

export default function SeletorLoja({ empresaAtualId, empresaAtualNome }: { empresaAtualId?: string, empresaAtualNome: string }) {
  const [lojas, setLojas] = useState<any[]>([]);
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [loadingTroca, setLoadingTroca] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  
  useEffect(() => {
    axios.get('/api/admin/trocar-loja').then(res => setLojas(res.data)).catch(() => {});
  }, []);

  const trocarLoja = async (id: string) => {
    if (id === empresaAtualId) return;
    setLoadingTroca(true);
    try {
        await axios.post('/api/admin/trocar-loja', { empresaId: id });
        window.location.href = '/admin'; 
    } catch (e) { 
        alert('Erro ao trocar de loja.');
        setLoadingTroca(false);
    }
  };

  const criarNovaLoja = async () => {
      if(!novoNome.trim()) return;
      try {
          await axios.post('/api/admin/nova-loja', { nome: novoNome });
          window.location.href = '/admin'; 
      } catch (error) { alert('Erro ao criar.'); }
  };

  return (
    <>
      {/* === BOTÃO DE ACIONAMENTO === */}
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

      {/* === MODAL / DROPDOWN === */}
      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Escuro */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAberto(false)} />

            {/* Janela Flutuante */}
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Cabeçalho */}
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
                        const isAtiva = loja.id === empresaAtualId;
                        return (
                            <button 
                                key={loja.id} 
                                onClick={() => trocarLoja(loja.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${isAtiva ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <Building2 size={16} className={isAtiva ? 'text-purple-200' : 'text-slate-500'} />
                                    {loja.nome}
                                </span>
                                {isAtiva && <Check size={16} />}
                            </button>
                        )
                    })}
                </div>

                {/* Rodapé (Criar Nova) */}
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