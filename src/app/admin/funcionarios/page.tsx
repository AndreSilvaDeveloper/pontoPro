'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Trash2, User } from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  email: string;
}

export default function GestaoFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Carrega a lista ao abrir a página
  useEffect(() => {
    carregarLista();
  }, []);

  const carregarLista = async () => {
    const res = await axios.get('/api/admin/funcionarios');
    setFuncionarios(res.data);
  };

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/admin/funcionarios', { nome, email });
      setNome('');
      setEmail('');
      carregarLista(); // Atualiza a tabela
      alert('Funcionário cadastrado! Senha padrão: mudar123');
    } catch (error) {
      alert('Erro ao cadastrar. Verifique se o email já existe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Topo */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">Equipe</h1>
            <p className="text-slate-400 text-sm">Gerencie quem pode bater ponto</p>
          </div>
          <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} /> Voltar
          </Link>
        </div>

        {/* Formulário de Cadastro */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-green-500"/> Novo Funcionário
          </h2>
          <form onSubmit={cadastrar} className="flex flex-col md:flex-row gap-4">
            <input 
              placeholder="Nome completo" 
              className="bg-slate-950 border border-slate-700 p-3 rounded-lg flex-1 text-white"
              value={nome} onChange={e => setNome(e.target.value)} required
            />
            <input 
              placeholder="Email profissional" 
              type="email"
              className="bg-slate-950 border border-slate-700 p-3 rounded-lg flex-1 text-white"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <button 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold transition-colors"
            >
              {loading ? 'Salvando...' : 'Cadastrar'}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-2">* A senha inicial será: <strong>mudar123</strong></p>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {funcionarios.map(func => (
            <div key={func.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                  <User size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold">{func.nome}</h3>
                  <p className="text-sm text-slate-400">{func.email}</p>
                </div>
              </div>
              {/* Aqui poderíamos colocar botão de Excluir no futuro */}
            </div>
          ))}
          
          {funcionarios.length === 0 && (
            <p className="text-center text-slate-500 py-8">Nenhum funcionário cadastrado ainda.</p>
          )}
        </div>

      </div>
    </div>
  );
}