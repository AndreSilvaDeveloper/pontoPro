'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
// ADICIONEI O Trash2 AQUI NOS IMPORTS
import { Building2, User, Lock, CheckCircle, ShieldAlert, Ban, PlayCircle, RefreshCw, Wand2, LogOut, Settings, Trash2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

export default function SuperAdminPage() {
  
  // === ESTADOS DE CADASTRO ===
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeDono, setNomeDono] = useState('');
  const [emailDono, setEmailDono] = useState('');
  const [senhaInicial, setSenhaInicial] = useState('1234');
  const [loadingCriar, setLoadingCriar] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  // === ESTADOS DE GESTÃO ===
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loadingListar, setLoadingListar] = useState(false);

  // Carrega lista automaticamente ao entrar
  useEffect(() => {
      listarEmpresas();
  }, []);

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCriar(true);
    setResultado(null);
    try {
      const res = await axios.post('/api/saas/criar-empresa', {
        nomeEmpresa, cnpj, nomeDono, emailDono, senhaInicial
      });
      setResultado(res.data);
      setNomeEmpresa(''); setCnpj(''); setNomeDono(''); setEmailDono('');
      listarEmpresas(); 
    } catch (error: any) { alert(error.response?.data?.erro || 'Erro ao criar.'); } 
    finally { setLoadingCriar(false); }
  };

  const listarEmpresas = async () => {
      setLoadingListar(true);
      try {
          const res = await axios.post('/api/saas/gestao'); 
          setEmpresas(res.data);
      } catch (error) { console.error('Erro listar'); }
      finally { setLoadingListar(false); }
  };

  const alternarStatus = async (id: string, nome: string, statusAtual: string) => {
      const acao = statusAtual === 'ATIVO' ? 'BLOQUEAR' : 'ATIVAR';
      if(!confirm(`Deseja realmente ${acao} o acesso da empresa ${nome}?`)) return;

      try {
          await axios.put('/api/saas/gestao', { empresaId: id, acao: 'ALTERAR_STATUS' });
          listarEmpresas();
      } catch (error) { alert('Erro ao alterar status'); }
  };

  // === NOVA FUNÇÃO DE EXCLUSÃO ===
  const excluirEmpresa = async (id: string, nome: string) => {
      const confirmacao = window.prompt(`PERIGO: Isso apagará TODOS os dados, funcionários e pontos da empresa "${nome}".\n\nEssa ação é irreversível.\n\nPara confirmar, digite "DELETAR":`);
      
      if (confirmacao !== "DELETAR") {
          return;
      }

      try {
          // DELETE request envia dados dentro da propriedade 'data'
          await axios.delete('/api/saas/excluir-empresa', { 
              data: { id } 
          });
          
          alert("Empresa excluída com sucesso!");
          listarEmpresas(); // Atualiza a lista
      } catch (error: any) {
          alert(error.response?.data?.erro || "Erro ao excluir empresa.");
      }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
        
      <div className="absolute top-6 right-6">
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg border border-red-900 transition-colors text-sm font-bold">
              <LogOut size={16} /> Sair
          </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="text-center pt-8">
          <h1 className="text-3xl font-bold text-purple-500 flex justify-center items-center gap-2">
            <ShieldAlert /> Super Admin
          </h1>
          <p className="text-gray-400">Painel de Controle Geral</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* CRIAR CLIENTE */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400"><Building2/> Nova Venda</h2>
                
                {resultado && (
                    <div className="bg-green-900/30 border border-green-500 p-4 rounded-xl mb-4 animate-pulse">
                        <p className="font-bold text-green-400 mb-2">✅ Cliente Criado!</p>
                        <div className="text-xs font-mono space-y-1 text-gray-300">
                            <p>Empresa: {resultado.dados.empresa}</p>
                            <p>Login: <span className="text-white select-all">{resultado.dados.login}</span></p>
                            <p>Senha: <span className="text-white select-all">{resultado.dados.senha}</span></p>
                        </div>
                    </div>
                )}

                <form onSubmit={criarCliente} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <input className="bg-gray-800 border-gray-700 p-3 rounded text-white text-sm focus:border-purple-500 outline-none" placeholder="Nome da Empresa" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} required />
                        <input className="bg-gray-800 border-gray-700 p-3 rounded text-white text-sm focus:border-purple-500 outline-none" placeholder="CNPJ" value={cnpj} onChange={e => setCnpj(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="bg-gray-800 border-gray-700 p-3 rounded text-white text-sm focus:border-purple-500 outline-none" placeholder="Nome Dono" value={nomeDono} onChange={e => setNomeDono(e.target.value)} required />
                        <input className="bg-gray-800 border-gray-700 p-3 rounded text-white text-sm focus:border-purple-500 outline-none" placeholder="Email Login" value={emailDono} onChange={e => setEmailDono(e.target.value)} required />
                    </div>
                    <button disabled={loadingCriar} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-green-900/30">
                        {loadingCriar ? 'Criando...' : 'CRIAR CLIENTE'}
                    </button>
                </form>
            </div>

            {/* LISTA DE GESTÃO */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl flex flex-col h-[500px]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400"><Lock/> Clientes</h2>
                    <button onClick={listarEmpresas} className="text-sm bg-blue-900/30 text-blue-400 px-3 py-1 rounded hover:bg-blue-800 flex items-center gap-2 transition-colors">
                        <RefreshCw size={14}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {loadingListar ? <p className="text-center text-gray-500 py-10 animate-pulse">Carregando...</p> : (
                        empresas.length === 0 ? <p className="text-center text-gray-600 py-10 px-4">Nenhuma empresa encontrada.</p> :
                        empresas.map(emp => (
                            <div key={emp.id} className={`p-3 rounded-lg border flex justify-between items-center transition-colors ${emp.status === 'BLOQUEADO' ? 'bg-red-900/10 border-red-900' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
                                <div>
                                    <p className={`font-bold text-sm ${emp.status === 'BLOQUEADO' ? 'text-red-400' : 'text-white'}`}>
                                        {emp.nome} {emp.status === 'BLOQUEADO' && '(SUSPENSO)'}
                                    </p>
                                    <p className="text-[10px] text-gray-500">{emp._count?.usuarios || 0} usuários • {new Date(emp.criadoEm).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/saas/${emp.id}`} className="p-2 bg-purple-900/30 text-purple-400 hover:bg-purple-600 hover:text-white rounded transition-colors" title="Configurações">
                                        <Settings size={16}/>
                                    </Link>
                                    
                                    <button 
                                        onClick={() => alternarStatus(emp.id, emp.nome, emp.status)}
                                        className={`p-2 rounded transition-colors ${emp.status === 'ATIVO' ? 'bg-orange-600/20 text-orange-500 hover:bg-orange-600 hover:text-white' : 'bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white'}`}
                                        title={emp.status === 'ATIVO' ? "Bloquear Acesso" : "Liberar Acesso"}
                                    >
                                        {emp.status === 'ATIVO' ? <Ban size={16} /> : <PlayCircle size={16} />}
                                    </button>

                                    {/* BOTÃO DE EXCLUIR */}
                                    <button 
                                        onClick={() => excluirEmpresa(emp.id, emp.nome)}
                                        className="p-2 bg-red-900/30 text-red-500 hover:bg-red-600 hover:text-white rounded transition-colors"
                                        title="Excluir Empresa"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}