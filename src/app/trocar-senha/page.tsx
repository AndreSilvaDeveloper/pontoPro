'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function TrocarSenhaPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  // Impersonate pula onboarding
  if ((session?.user as any)?.impersonatedBy || (session?.user as any)?.cargo === 'SUPER_ADMIN') {
    if (typeof window !== 'undefined') window.location.href = '/funcionario';
    return null;
  }
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
      const response = await axios.post('/api/auth/trocar-senha', { novaSenha: senha });
      setMsg('✅ Senha alterada! Redirecionando...');

      // Atualiza a sessão sem logout
      await update({ deveTrocarSenha: false });

      setTimeout(() => {
        if (!response.data.temAssinatura) {
          router.push('/cadastrar-assinatura');
        } else if (response.data.deveCadastrarFoto) {
          router.push('/cadastrar-foto');
        } else if (response.data.deveDarCienciaCelular) {
          router.push('/ciencia-celular');
        } else {
          router.push('/funcionario');
        }
      }, 1500);

    } catch (error: any) {
      setMsg('❌ ' + (error.response?.data?.erro || 'Erro ao salvar.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="w-full max-w-md bg-surface-solid p-8 rounded-2xl border border-red-900/50 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-500">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Troca de senha Obrigatória</h1>
          <p className="text-text-muted text-sm">
            Para sua segurança, você precisa definir uma nova senha antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Nova Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-elevated-solid border border-border-input rounded-lg py-3 px-4 text-text-primary focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Mínimo 4 caracteres"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Confirme a Senha</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full bg-elevated-solid border border-border-input rounded-lg py-3 px-4 text-text-primary focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Digite novamente"
              required
            />
          </div>

          {msg && <div className="text-center font-bold text-sm text-text-primary">{msg}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'DEFINIR NOVA SENHA'}
          </button>
        </form>
      </div>
    </div>
  );
}