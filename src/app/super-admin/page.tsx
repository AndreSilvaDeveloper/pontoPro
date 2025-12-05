'use client';

import { useState } from 'react';
import axios from 'axios';
import { Building2, Key, User, Lock, CheckCircle, ShieldAlert } from 'lucide-react';

export default function SuperAdminPage() {
  const [masterKey, setMasterKey] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeDono, setNomeDono] = useState('');
  const [emailDono, setEmailDono] = useState('');
  const [senhaInicial, setSenhaInicial] = useState('mudar123');

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
      const res = await axios.post('/api/saas/criar-empresa', {
        masterKey,
        nomeEmpresa,
        cnpj,
        nomeDono,
        emailDono,
        senhaInicial
      });
      
      setResultado(res.data);
      // Limpa para o próximo
      setNomeEmpresa(''); setCnpj(''); setNomeDono(''); setEmailDono('');
      
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao criar cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-purple-500 flex justify-center items-center gap-2">
            <ShieldAlert /> Painel Super Admin
          </h1>
          <p className="text-gray-400">Área restrita para criação de novos clientes SaaS.</p>
        </div>

        {/* RESULTADO (SUCESSO) */}
        {resultado && (
          <div className="bg-green-900/30 border border-green-500 p-6 rounded-xl animate-pulse">
            <div className="flex items-center gap-2 text-green-400 mb-4">
              <CheckCircle size={24} />
              <h2 className="text-xl font-bold">Venda Realizada!</h2>
            </div>
            <div className="bg-black p-4 rounded text-sm font-mono space-y-2 border border-green-900">
              <p><span className="text-gray-500">Cliente:</span> {resultado.dados.empresa}</p>
              <p><span className="text-gray-500">Login:</span> <span className="text-white select-all">{resultado.dados.login}</span></p>
              <p><span className="text-gray-500">Senha:</span> <span className="text-white select-all">{resultado.dados.senha}</span></p>
            </div>
            <p className="text-xs text-green-300 mt-4 text-center">Copie esses dados e envie para o cliente.</p>
          </div>
        )}

        {/* FORMULÁRIO */}
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
          <form onSubmit={criarCliente} className="space-y-6">
            
            {/* SENHA MESTRA */}
            <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-900 mb-6">
              <label className="block text-sm font-bold text-purple-400 mb-2 flex items-center gap-2">
                <Key size={16} /> Senha Mestra (.env)
              </label>
              <input 
                type="password" 
                placeholder="Digite a chave SAAS_MASTER_KEY"
                value={masterKey} onChange={e => setMasterKey(e.target.value)}
                className="w-full bg-black border border-purple-800 p-3 rounded text-white focus:border-purple-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Empresa</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input className="w-full bg-gray-800 border border-gray-700 p-3 pl-10 rounded text-white" 
                    placeholder="Ex: Padaria do Zé"
                    value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">CNPJ</label>
                <input className="w-full bg-gray-800 border border-gray-700 p-3 rounded text-white" 
                  placeholder="00.000.000/0001-00"
                  value={cnpj} onChange={e => setCnpj(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Nome do Dono</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input className="w-full bg-gray-800 border border-gray-700 p-3 pl-10 rounded text-white" 
                    placeholder="Ex: José Silva"
                    value={nomeDono} onChange={e => setNomeDono(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email de Login</label>
                <input type="email" className="w-full bg-gray-800 border border-gray-700 p-3 rounded text-white" 
                  placeholder="admin@padaria.com"
                  value={emailDono} onChange={e => setEmailDono(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Senha Inicial</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                <input className="w-full bg-gray-800 border border-gray-700 p-3 pl-10 rounded text-white" 
                  value={senhaInicial} onChange={e => setSenhaInicial(e.target.value)} required />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'CRIAR ACESSO'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}