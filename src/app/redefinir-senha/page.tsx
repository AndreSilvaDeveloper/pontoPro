'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Componente interno para ler o token (necessário usar Suspense no Next.js)
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
        toast.error('Token inválido ou link quebrado.');
        return;
    }

    if (novaSenha.length < 6) {
        toast.warning('A senha deve ter no mínimo 6 caracteres.');
        return;
    }

    if (novaSenha !== confirmar) {
        toast.error('As senhas não coincidem.');
        return;
    }

    setLoading(true);

    try {
        const res = await fetch('/api/auth/redefinir-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, novaSenha })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.erro || 'Erro ao redefinir.');

        setSucesso(true);
        toast.success('Senha alterada com sucesso!');

        // Redireciona para o login após 3 segundos
        setTimeout(() => router.push('/login'), 3000);

    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setLoading(false);
    }
  }

  // Se deu certo, mostra tela de sucesso
  if (sucesso) {
      return (
        <div className="text-center animate-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Senha Atualizada!</h2>
            <p className="text-text-muted mb-6">Você será redirecionado para o login em instantes...</p>
            <button 
                onClick={() => router.push('/login')}
                className="bg-elevated-solid hover:bg-elevated-solid text-text-primary px-6 py-2 rounded-lg transition-colors"
            >
                Ir para Login agora
            </button>
        </div>
      );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 mb-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                <KeyRound size={32} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Nova Senha</h1>
            <p className="text-text-muted text-sm mt-1">Digite sua nova senha abaixo.</p>
        </div>

        <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted ml-1 uppercase">Nova Senha</label>
            <input 
              type="password" 
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full bg-input-solid/50 border border-border-input/50 text-text-primary p-3.5 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-text-dim"
              placeholder="••••••••"
              required
            />
        </div>

        <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted ml-1 uppercase">Confirmar Senha</label>
            <input 
              type="password" 
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full bg-input-solid/50 border border-border-input/50 text-text-primary p-3.5 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-text-dim"
              placeholder="••••••••"
              required
            />
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 active:scale-[0.98]"
        >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'DEFINIR NOVA SENHA'}
        </button>

        <button 
            type="button"
            onClick={() => router.push('/login')}
            className="w-full text-text-faint hover:text-text-primary text-sm py-2 transition-colors flex items-center justify-center gap-2"
        >
            <ArrowLeft size={16}/> Cancelar
        </button>
    </form>
  );
}

// Componente Principal (Página)
export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-page selection:bg-purple-500/30">
      
      {/* Efeitos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[120px] pointer-events-none" />

      {/* Card */}
      <div className="w-full max-w-md p-8 bg-surface/60 backdrop-blur-xl border border-border-default rounded-3xl shadow-2xl relative z-10">
        <Suspense fallback={<div className="text-center text-text-primary">Carregando formulário...</div>}>
            <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}