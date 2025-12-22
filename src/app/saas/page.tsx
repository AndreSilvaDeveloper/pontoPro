'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, Lock, Ban, PlayCircle, RefreshCw, LogOut, 
  Settings, Trash2, UserPlus, X, Loader2, Users 
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

export default function SuperAdminPage() {
  
  // === ESTADOS GERAIS ===
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loadingListar, setLoadingListar] = useState(false);
  
  // === CADASTRO EMPRESA ===
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeDono, setNomeDono] = useState('');
  const [emailDono, setEmailDono] = useState('');
  const [senhaInicial, setSenhaInicial] = useState('1234');
  const [loadingCriar, setLoadingCriar] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  // === MODAIS ===
  const [modalAdminOpen, setModalAdminOpen] = useState(false); // Adicionar Novo
  const [modalEquipeOpen, setModalEquipeOpen] = useState(false); // Ver Lista
  
  const [empresaSelecionada, setEmpresaSelecionada] = useState<any>(null);
  const [adminData, setAdminData] = useState({ nome: '', email: '', senha: '123' });
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => { listarEmpresas(); }, []);

  // --- API CALLS ---
  const listarEmpresas = async () => {
      setLoadingListar(true);
      try {
          const res = await axios.post('/api/saas/gestao'); 
          setEmpresas(res.data);
      } catch (error: any) { 
          // CORREÇÃO LOGOUT: Ignora erro 403 ao sair
          if (error.response?.status === 403) return;
          console.error('Erro listar', error); 
      }
      finally { setLoadingListar(false); }
  };

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCriar(true);
    setResultado(null);
    try {
      const res = await axios.post('/api/saas/criar-empresa', { nomeEmpresa, cnpj, nomeDono, emailDono, senhaInicial });
      setResultado(res.data);
      setNomeEmpresa(''); setCnpj(''); setNomeDono(''); setEmailDono('');
      listarEmpresas(); 
    } catch (error: any) { alert(error.response?.data?.erro || 'Erro ao criar.'); } 
    finally { setLoadingCriar(false); }
  };

  // --- FUNÇÕES DE USUÁRIOS (ADMINS) ---
  const excluirUsuario = async (userId: string) => {
      if(!confirm("Tem certeza que deseja remover este acesso?")) return;
      try {
          await axios.delete('/api/saas/excluir-usuario', { data: { id: userId } });
          
          // Atualiza a lista local do modal imediatamente
          const novaLista = empresaSelecionada.usuarios.filter((u: any) => u.id !== userId);
          setEmpresaSelecionada({ ...empresaSelecionada, usuarios: novaLista });
          
          // Atualiza a lista do fundo
          listarEmpresas(); 
      } catch (e: any) { alert(e.response?.data?.erro || 'Erro ao excluir usuário'); }
  };

  const salvarNovoAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoadingAdmin(true);
      try {
          await axios.post('/api/saas/novo-admin', {
              empresaId: empresaSelecionada.id, 
              nome: adminData.nome,
              email: adminData.email,
              senha: adminData.senha
          });
          alert(`Acesso criado para ${adminData.nome}!`);
          setModalAdminOpen(false);
          listarEmpresas();
      } catch (error: any) { alert(error.response?.data?.erro || 'Erro ao criar admin'); }
      finally { setLoadingAdmin(false); }
  };

  // --- FUNÇÕES DE STATUS DA EMPRESA ---
  const alternarStatus = async (id: string, nome: string, status: string) => {
      const acao = status === 'ATIVO' ? 'BLOQUEAR' : 'ATIVAR';
      if(!confirm(`Deseja ${acao} a empresa ${nome}?`)) return;
      
      try {
        await axios.put('/api/saas/gestao', { empresaId: id, acao: 'ALTERAR_STATUS' });
        listarEmpresas();
      } catch (e) { alert('Erro ao alterar status'); }
  };
  
  const excluirEmpresa = async (id: string, nome: string) => {
      const confirmacao = window.prompt(`PERIGO: Isso apagará TODOS os dados de "${nome}".\nDigite "DELETAR" para confirmar:`);
      if(confirmacao !== "DELETAR") return;

      try {
        await axios.delete('/api/saas/excluir-empresa', { data: { id } });
        alert("Empresa excluída!");
        listarEmpresas();
      } catch (e: any) { alert(e.response?.data?.erro || 'Erro ao excluir'); }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
      <div className="absolute top-6 right-6">
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg border border-red-900 transition-colors text-sm font-bold">
              <LogOut size={16} /> Sair
          </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 pt-8">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-purple-500 flex justify-center items-center gap-2">🛡️ Super Admin</h1>
            <p className="text-gray-400">Painel de Controle Geral</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* CRIAR EMPRESA */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
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
                        <input className="bg-gray-800 p-3 rounded w-full outline-none focus:border-purple-500 border border-gray-700 text-sm" placeholder="Empresa" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} required />
                        <input className="bg-gray-800 p-3 rounded w-full outline-none focus:border-purple-500 border border-gray-700 text-sm" placeholder="CNPJ" value={cnpj} onChange={e => setCnpj(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="bg-gray-800 p-3 rounded w-full outline-none focus:border-purple-500 border border-gray-700 text-sm" placeholder="Nome Dono" value={nomeDono} onChange={e => setNomeDono(e.target.value)} required />
                        <input className="bg-gray-800 p-3 rounded w-full outline-none focus:border-purple-500 border border-gray-700 text-sm" placeholder="Email Login" value={emailDono} onChange={e => setEmailDono(e.target.value)} required />
                    </div>
                    <button disabled={loadingCriar} className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold transition-all disabled:opacity-50">
                        {loadingCriar ? 'Criando...' : 'CRIAR CLIENTE'}
                    </button>
                </form>
            </div>

            {/* LISTA DE CLIENTES */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-[500px] flex flex-col shadow-xl">
                <div className="flex justify-between mb-4 items-center">
                    <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2"><Lock/> Clientes</h2>
                    <button onClick={listarEmpresas} className="text-blue-400 hover:bg-blue-900/30 p-2 rounded transition-colors"><RefreshCw size={18}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {loadingListar ? <p className="text-center text-gray-500 py-10">Carregando...</p> : (
                        empresas.map(emp => (
                            <div key={emp.id} className={`p-3 rounded-lg border flex justify-between items-center transition-colors ${emp.status === 'BLOQUEADO' ? 'border-red-900 bg-red-900/10' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                                <div>
                                    <p className={`font-bold text-sm ${emp.status === 'BLOQUEADO' ? 'text-red-400' : 'text-white'}`}>
                                        {emp.nome} {emp.status === 'BLOQUEADO' && '(SUSPENSO)'}
                                    </p>
                                    <p className="text-[10px] text-gray-500">{emp.usuarios?.length || 0} acessos admin • {new Date(emp.criadoEm).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-1">
                                    {/* BOTÃO 1: VER EQUIPE (CONTROLAR ACESSOS) */}
                                    <button onClick={() => { setEmpresaSelecionada(emp); setModalEquipeOpen(true); }} className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors" title="Gerenciar Acessos">
                                        <Users size={16}/>
                                    </button>
                                    
                                    {/* BOTÃO 2: ADD NOVO SÓCIO */}
                                    <button onClick={() => { setEmpresaSelecionada(emp); setAdminData({ ...adminData, nome: '', email: '', senha: '123' }); setModalAdminOpen(true); }} className="p-2 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded transition-colors" title="Add Sócio">
                                        <UserPlus size={16}/>
                                    </button>

                                    <Link href={`/saas/${emp.id}`} className="p-2 bg-purple-900/30 text-purple-400 hover:bg-purple-600 hover:text-white rounded transition-colors" title="Configurações">
                                        <Settings size={16}/>
                                    </Link>

                                    <button onClick={() => alternarStatus(emp.id, emp.nome, emp.status)} className={`p-2 rounded transition-colors ${emp.status === 'ATIVO' ? 'bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white' : 'bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white'}`}>
                                        {emp.status === 'ATIVO' ? <Ban size={16}/> : <PlayCircle size={16}/>}
                                    </button>
                                    
                                    <button onClick={() => excluirEmpresa(emp.id, emp.nome)} className="p-2 bg-red-900/30 text-red-500 hover:bg-red-600 hover:text-white rounded transition-colors">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* === MODAL 1: ADICIONAR NOVO ADMIN === */}
      {modalAdminOpen && empresaSelecionada && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
                  <button onClick={() => setModalAdminOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                  <h3 className="text-lg font-bold mb-1 text-white">Novo Acesso</h3>
                  <p className="text-xs text-purple-400 mb-4 font-bold">{empresaSelecionada.nome}</p>
                  
                  <form onSubmit={salvarNovoAdmin} className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500">Nome do Responsável</label>
                        <input className="w-full bg-gray-800 p-2.5 rounded-lg text-white border border-gray-700 focus:border-purple-500 outline-none" placeholder="Ex: João Silva" onChange={e => setAdminData({...adminData, nome: e.target.value})} required />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500">Email de Login</label>
                        <input className="w-full bg-gray-800 p-2.5 rounded-lg text-white border border-gray-700 focus:border-purple-500 outline-none" placeholder="email@empresa.com" type="email" onChange={e => setAdminData({...adminData, email: e.target.value})} required />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500">Senha Provisória</label>
                        <input className="w-full bg-gray-800 p-2.5 rounded-lg text-white border border-gray-700 focus:border-purple-500 outline-none" placeholder="******" value={adminData.senha} onChange={e => setAdminData({...adminData, senha: e.target.value})} required />
                      </div>
                      <button disabled={loadingAdmin} className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold mt-2 flex justify-center items-center gap-2 transition-colors">
                        {loadingAdmin ? <Loader2 className="animate-spin" size={18}/> : 'CRIAR ACESSO'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* === MODAL 2: GERENCIAR EQUIPE (LISTA DE USUÁRIOS) === */}
      {modalEquipeOpen && empresaSelecionada && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md relative shadow-2xl">
                  <button onClick={() => setModalEquipeOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                  
                  <h3 className="text-xl font-bold mb-1 flex items-center gap-2 text-white"><Users className="text-purple-500"/> Gestão de Acessos</h3>
                  <p className="text-sm text-gray-400 mb-6">Administradores da empresa <span className="text-purple-400 font-bold">{empresaSelecionada.nome}</span></p>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {(!empresaSelecionada.usuarios || empresaSelecionada.usuarios.length === 0) ? (
                          <p className="text-center text-gray-500 py-4 italic">Nenhum usuário encontrado.</p>
                      ) : (
                          empresaSelecionada.usuarios.map((user: any) => (
                              <div key={user.id} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center border border-gray-700 group hover:border-gray-500 transition-colors">
                                  <div>
                                      <p className="font-bold text-sm text-white">{user.nome}</p>
                                      <p className="text-xs text-gray-400">{user.email}</p>
                                      <span className="text-[10px] bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded uppercase font-bold">{user.cargo}</span>
                                  </div>
                                  <button 
                                      onClick={() => excluirUsuario(user.id)}
                                      className="p-2 bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded transition-colors"
                                      title="Remover Acesso"
                                  >
                                      <Trash2 size={16}/>
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-800">
                      <button onClick={() => { setModalEquipeOpen(false); setModalAdminOpen(true); }} className="w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                          <UserPlus size={16}/> Adicionar Novo Acesso
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}