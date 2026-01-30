'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, UserPlus, RefreshCw, User, Pencil, Trash2, Users, Monitor } from 'lucide-react';

// IMPORTAÇÃO IMPORTANTE: Trazemos o componente e a Interface 'Funcionario' de lá
import ModalFuncionario, { Funcionario } from '@/components/ModalFuncionario';

export default function GestaoFuncionarios() {
  // Agora 'funcionarios' usa a tipagem completa que vem do Modal
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [lojaAtual, setLojaAtual] = useState('Carregando...');
  
  // Controle do Modal
  const [showModal, setShowModal] = useState(false);
  
  // Pode ser 'null' (novo cadastro) ou um objeto 'Funcionario' (edição)
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null);

  useEffect(() => { 
      carregarLista(); 
      axios.get('/api/admin/empresa')
        .then(res => setLojaAtual(res.data.nome))
        .catch(() => setLojaAtual('Minha Empresa'));
  }, []);

  const carregarLista = async () => {
    try {
        const res = await axios.get('/api/admin/funcionarios');
        // O TS não vai reclamar pois esperamos que a API devolva o objeto completo
        setFuncionarios(res.data);
    } catch (e) { 
        console.error("Erro lista", e); 
    }
  };

  const handleNovo = () => {
    setFuncionarioSelecionado(null); // Define como NULL para indicar que é NOVO
    setShowModal(true);
  };

  const handleEditar = (f: Funcionario) => {
    setFuncionarioSelecionado(f); // Passa o objeto completo com Lat/Lng, etc.
    setShowModal(true);
  };

  const excluirFuncionario = async (id: string, nome: string) => {
    if (confirm(`Excluir ${nome}?`)) {
      try {
        await axios.delete(`/api/admin/funcionarios?id=${id}`);
        carregarLista();
      } catch (error) { alert('Erro ao excluir.'); }
    }
  };

  const resetarSenha = async (id: string, nomeFunc: string) => {
    if (!confirm(`Resetar senha de ${nomeFunc}?`)) return;
    try { 
        await axios.post('/api/admin/funcionarios/resetar-senha', { usuarioId: id }); 
        alert('Senha resetada! \n senha padrão: 1234'); 
    } catch (error) { 
        alert('Erro ao resetar.'); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* TOPO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-purple-400 flex items-center gap-2"><Users size={24}/> Gestão de Equipe</h1>
            <p className="text-slate-400 text-sm">{lojaAtual}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-3 rounded-xl font-bold text-sm flex gap-2 items-center transition-colors">
                <ArrowLeft size={18} /> Voltar
            </Link>
            <button onClick={handleNovo} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold text-sm flex gap-2 items-center shadow-lg shadow-green-900/20 transition-colors">
                <UserPlus size={18} /> Novo
            </button>
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="grid gap-3">
          {funcionarios.length === 0 && <p className="text-slate-500 text-center py-10">Nenhum funcionário cadastrado.</p>}
          
          {funcionarios.map(func => (
            <div key={func.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 shadow-md hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                {func.fotoPerfilUrl ? (
                  <img src={func.fotoPerfilUrl} alt={func.nome} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 flex-shrink-0">
                    <User size={20} className="text-slate-500" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <h3 className="font-bold text-white text-base truncate">{func.nome}</h3>
                  <p className="text-xs text-slate-400 truncate">{func.email}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                      {func.tituloCargo && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-purple-400 font-bold uppercase">{func.tituloCargo}</span>}
                      {func.pontoLivre && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">Livre</span>}
                      {func.modoValidacaoPonto === 'PC_IP' && <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1"><Monitor size={10}/> IP Fixo</span>}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3">
                <button
                  onClick={() => handleEditar(func)}
                  className="flex items-center justify-center gap-2 py-2 px-2 bg-slate-800 text-blue-400 rounded-lg text-[11px] sm:text-xs font-bold hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <Pencil size={14} />
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">Editar</span>
                </button>

                <button
                  onClick={() => resetarSenha(func.id, func.nome)}
                  className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-2 bg-slate-800 text-yellow-500 rounded-lg text-[11px] sm:text-xs font-bold hover:bg-slate-700 transition-colors leading-tight"
                >
                  <RefreshCw size={14} />
                  <span className="sm:hidden text-center">
                    Resetar<br />Senha
                  </span>
                  <span className="hidden sm:inline whitespace-nowrap">Resetar Senha</span>
                </button>


                <button
                  onClick={() => excluirFuncionario(func.id, func.nome)}
                  className="flex items-center justify-center gap-2 py-2 px-2 bg-slate-800 text-red-500 rounded-lg text-[11px] sm:text-xs font-bold hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <Trash2 size={14} />
                  <span className="sm:hidden">Excluir</span>
                  <span className="hidden sm:inline">Excluir</span>
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* COMPONENTE DO MODAL */}
        <ModalFuncionario 
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          funcionarioEdicao={funcionarioSelecionado}
          onSuccess={carregarLista}
        />

      </div>
    </div>
  );
}