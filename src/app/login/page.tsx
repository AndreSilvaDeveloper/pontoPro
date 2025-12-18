'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Loader2, ShieldCheck, Smartphone, Share, PlusSquare, MoreVertical } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // === ESTADOS PWA (Lógica Mantida) ===
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showTutorial, setShowTutorial] = useState<'IOS' | 'ANDROID_GENERIC' | null>(null);

  // === LÓGICA DE DETECÇÃO (Lógica Mantida) ===
  useEffect(() => {
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isInStandaloneMode) {
        setIsStandalone(true);
        return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') setDeferredPrompt(null);
        });
    } else if (isIOS) {
        setShowTutorial('IOS');
    } else {
        setShowTutorial('ANDROID_GENERIC');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', { redirect: false, email, password });

      if (result?.error) {
        setError('Credenciais inválidas.');
        setLoading(false);
      } else {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (sessionData?.user?.cargo === 'SUPER_ADMIN') router.push('/saas');
        else if (sessionData?.user?.cargo === 'ADMIN') router.push('/admin');
        else router.push('/');
      }
    } catch (err) { setError('Erro no login.'); setLoading(false); }
  };

  return (
    // Fundo com Gradiente e Efeitos de Luz
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950 selection:bg-purple-500/30">
      
      {/* Efeitos de Fundo (Orbs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse delay-1000" />

      {/* === MODAL DE TUTORIAL === */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowTutorial(null)}>
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowTutorial(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">&times;</button>
                
                {showTutorial === 'IOS' && (
                    <>
                        <h3 className="text-xl font-bold text-white">Instalar no iPhone</h3>
                        <p className="text-slate-400 text-sm">Siga os passos abaixo:</p>
                        <div className="space-y-3 bg-white/5 p-4 rounded-xl text-left text-sm text-slate-300 border border-white/5">
                            <p className="flex items-center gap-3"><Share size={18} className="text-blue-400"/> 1. Toque em <strong>Compartilhar</strong>.</p>
                            <p className="flex items-center gap-3"><PlusSquare size={18} className="text-white"/> 2. Toque em <strong>Adicionar à Tela de Início</strong>.</p>
                            <p className="flex items-center gap-3"><span className="font-bold text-purple-400">WorkID</span> 3. Confirme em <strong>Adicionar</strong>.</p>
                        </div>
                    </>
                )}

                {showTutorial === 'ANDROID_GENERIC' && (
                    <>
                        <h3 className="text-xl font-bold text-white">Instalar Aplicativo</h3>
                        <div className="space-y-3 bg-white/5 p-4 rounded-xl text-left text-sm text-slate-300 border border-white/5">
                            <p className="flex items-center gap-3"><MoreVertical size={18} className="text-white"/> 1. Toque no <strong>Menu</strong> do navegador.</p>
                            <p className="flex items-center gap-3"><Smartphone size={18} className="text-blue-400"/> 2. Selecione <strong>Instalar aplicativo</strong>.</p>
                        </div>
                    </>
                )}
                
                <button onClick={() => setShowTutorial(null)} className="w-full bg-white text-slate-950 font-bold py-3 rounded-xl mt-2 hover:bg-slate-200 transition-colors">Entendi</button>
            </div>
        </div>
      )}

      {/* === CARD DE LOGIN (Glassmorphism) === */}
      <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 mb-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
             <span className="text-3xl filter drop-shadow-lg">🚀</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">WorkID</h1>
          <p className="text-slate-400 text-sm">Gestão Inteligente de Ponto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Email</label>
            <div className="relative group">
                <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors"><User size={20}/></div>
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700/50 text-white p-3.5 pl-12 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-slate-600 hover:border-slate-600"
                  placeholder="exemplo@workid.com"
                  required
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Senha</label>
            <div className="relative group">
                <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors"><ShieldCheck size={20}/></div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700/50 text-white p-3.5 pl-12 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-slate-600 hover:border-slate-600"
                  placeholder="••••••••"
                  required
                />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3 rounded-lg text-center animate-pulse">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 active:scale-[0.98] mt-2 group"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>ACESSAR SISTEMA <span className="group-hover:translate-x-1 transition-transform">→</span></>
            )}
          </button>

          {/* === BOTÃO DE INSTALAR (Estilizado) === */}
          {!isStandalone && (
            <div className="pt-6 mt-2">
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-700/50"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] uppercase tracking-widest">Opções do App</span>
                    <div className="flex-grow border-t border-slate-700/50"></div>
                </div>
                
                <button
                    type="button" 
                    onClick={handleInstallClick}
                    className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-purple-500/30 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 text-sm mt-2 group"
                >
                    <div className="bg-slate-700 p-1.5 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Smartphone size={16} /> 
                    </div>
                    {isIOS ? 'Instalar no iPhone' : 'Instalar Aplicativo'}
                </button>
            </div>
          )}

        </form>
        
        <p className="text-center text-slate-600 text-[10px] mt-8">
          © 2025 WorkID • Tecnologia em Gestão
        </p>
      </div>
    </div>
  );
}