'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');

    if (senha !== confirmar) {
      setMsg('❌ As senhas não conferem.');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/auth/trocar-senha', { novaSenha: senha });
      setMsg('✅ Senha alterada! Redirecionando...');
      
      // Força o logout para ele logar com a senha nova (Segurança máxima)
      setTimeout(() => {
        signOut({ callbackUrl: '/login' });
      }, 2000);

    } catch (error: any) {
      setMsg('❌ ' + (error.response?.data?.erro || 'Erro ao salvar.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-red-900/50 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-500">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Troca de senha Obrigatória</h1>
          <p className="text-slate-400 text-sm">
            Para sua segurança, você precisa definir uma nova senha antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nova Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Mínimo 4 caracteres"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Confirme a Senha</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Digite novamente"
              required
            />
          </div>

          {msg && <div className="text-center font-bold text-sm text-white">{msg}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'DEFINIR NOVA SENHA'}
          </button>
        </form>
      </div>
    </div>
  );
}