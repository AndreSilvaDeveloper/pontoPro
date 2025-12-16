'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Store, PlusCircle, CheckCircle, ChevronDown } from 'lucide-react';

export default function SeletorLoja({ empresaAtualId, empresaAtualNome }: { empresaAtualId?: string, empresaAtualNome: string }) {
  const [lojas, setLojas] = useState<any[]>([]);
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  
  useEffect(() => {
    // Carrega as lojas em segundo plano
    axios.get('/api/admin/trocar-loja').then(res => setLojas(res.data)).catch(() => {});
  }, []);

  const trocarLoja = async (id: string) => {
    if (id === empresaAtualId) return;
    try {
        await axios.post('/api/admin/trocar-loja', { novaEmpresaId: id });
        window.location.reload();
    } catch (e) { alert('Erro ao trocar.'); }
  };

  const criarNovaLoja = async () => {
      if(!novoNome) return;
      try {
          await axios.post('/api/admin/nova-loja', { nome: novoNome });
          alert('Loja criada!');
          window.location.reload(); 
      } catch (error) { alert('Erro ao criar.'); }
  };

  return (
    <div className="relative">
      {/* BOTÃO PADRÃO - IGUAL AOS OUTROS DO PAINEL */}
      <button 
        onClick={() => setAberto(!aberto)} 
        className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700 flex items-center gap-2 text-white"
        title="Trocar de Unidade"
      >
        <Store size={16} className="text-purple-400" />
        {/* Mostra o nome da loja ou 'Lojas' se ainda carregando */}
        <span className="font-semibold max-w-[100px] truncate">{empresaAtualNome || 'Minhas Lojas'}</span>
        {/* Pequena setinha discreta para indicar menu */}
        <ChevronDown size={12} className="text-slate-500"/>
      </button>

      {/* MENU DROPDOWN */}
      {aberto && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
            <div className="p-3 text-[10px] uppercase text-slate-500 font-bold tracking-wider bg-slate-950/50 border-b border-slate-800">
                Selecionar Unidade
            </div>
            
            <div className="max-h-60 overflow-y-auto">
                {lojas.map(loja => (
                    <button 
                        key={loja.id} 
                        onClick={() => trocarLoja(loja.id)} 
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-800 transition-colors flex items-center justify-between group border-b border-slate-800/50 ${loja.id === empresaAtualId ? 'bg-purple-900/10' : ''}`}
                    >
                        <span className={loja.id === empresaAtualId ? 'text-purple-400 font-bold' : 'text-slate-300'}>{loja.nome}</span>
                        {loja.id === empresaAtualId && <CheckCircle size={14} className="text-purple-500"/>}
                    </button>
                ))}
            </div>

            {/* ÁREA DE CRIAR NOVA LOJA */}
            <div className="p-3 bg-slate-950">
                {!criando ? (
                    <button onClick={() => setCriando(true)} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 py-2 rounded-lg transition-colors border border-dashed border-slate-700">
                        <PlusCircle size={14} /> Cadastrar Nova Filial
                    </button>
                ) : (
                    <div className="space-y-2 animate-in fade-in">
                        <input 
                            autoFocus 
                            type="text" 
                            placeholder="Nome da nova loja..." 
                            value={novoNome} 
                            onChange={e => setNovoNome(e.target.value)} 
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-purple-500" 
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setCriando(false)} className="flex-1 bg-slate-800 text-slate-400 text-[10px] py-1.5 rounded hover:bg-slate-700">Cancelar</button>
                            <button onClick={criarNovaLoja} className="flex-1 bg-purple-600 text-white text-[10px] py-1.5 rounded hover:bg-purple-700 font-bold">Criar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}