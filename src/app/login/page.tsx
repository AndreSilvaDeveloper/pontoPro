'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// Adicionei ArrowLeft, Mail, KeyRound aos imports
import { User, Loader2, ShieldCheck, Smartphone, Share, PlusSquare, MoreVertical, Eye, EyeOff, ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  
  // === ESTADOS DO FORMULÁRIO ===
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // === NOVO: ESTADO PARA TROCAR ENTRE LOGIN E RECUPERAÇÃO ===
  const [showRecovery, setShowRecovery] = useState(false);
  
  // === ESTADOS PWA ===
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showTutorial, setShowTutorial] = useState<'IOS' | 'ANDROID_GENERIC' | null>(null);

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

  // === LOGIN (MANTIDO) ===
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Autenticando credenciais...');

    try {
      const result = await signIn('credentials', { redirect: false, email, password });

      if (result?.error) {
        // === A CORREÇÃO ESTÁ AQUI ===
        // Em vez de texto fixo, usamos o erro que veio do servidor
        toast.error(result.error, { id: toastId }); 
        setLoading(false);
      } else {
        toast.success('Login autorizado! Entrando...', { id: toastId });
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (sessionData?.user?.cargo === 'SUPER_ADMIN') router.push('/saas');
        else if (sessionData?.user?.cargo === 'ADMIN') router.push('/admin');
        else router.push('/');
      }
    } catch (err) { 
        toast.error('Erro de conexão.', { id: toastId });
        setLoading(false); 
    }
  };

  // === NOVO: FUNÇÃO DE RECUPERAR SENHA ===
  const handleRecovery = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return toast.warning("Digite seu e-mail.");
      
      setLoading(true);
      const toastId = toast.loading('Enviando link de recuperação...');

      try {
          await fetch('/api/auth/esqueci-senha', {
              method: 'POST',
              body: JSON.stringify({ email }),
              headers: { 'Content-Type': 'application/json' }
          });

          // Mensagem genérica por segurança (mesmo se email não existir)
          toast.success('Se o e-mail existir, enviamos um link para você!', { id: toastId, duration: 5000 });
          setShowRecovery(false); // Volta para o login
          setPassword(''); // Limpa senha por segurança
      } catch (error) {
          toast.error('Erro ao tentar enviar e-mail.', { id: toastId });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950 selection:bg-purple-500/30">
      
      {/* Efeitos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse delay-1000" />

      {/* MODAL DE TUTORIAL PWA (Mantido) */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowTutorial(null)}>
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowTutorial(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">&times;</button>
                {showTutorial === 'IOS' ? (
                    <>
                        <h3 className="text-xl font-bold text-white">Instalar no iPhone</h3>
                        <div className="space-y-3 bg-white/5 p-4 rounded-xl text-left text-sm text-slate-300 border border-white/5">
                            <p className="flex items-center gap-3"><Share size={18} className="text-blue-400"/> 1. Toque em <strong>Compartilhar</strong>.</p>
                            <p className="flex items-center gap-3"><PlusSquare size={18} className="text-white"/> 2. Toque em <strong>Adicionar à Tela de Início</strong>.</p>
                            <p className="flex items-center gap-3"><span className="font-bold text-purple-400">WorkID</span> 3. Confirme em <strong>Adicionar</strong>.</p>
                        </div>
                    </>
                ) : (
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

      {/* === CARD PRINCIPAL === */}
      <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* CABEÇALHO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 mb-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
             <span className="text-3xl filter drop-shadow-lg">🚀</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">WorkID</h1>
          <p className="text-slate-400 text-sm">Gestão Inteligente de Ponto</p>
        </div>

        {/* === FORMULÁRIO (ALTERNÂNCIA) === */}
        {!showRecovery ? (
            
            // === 1. TELA DE LOGIN PADRÃO ===
            <form onSubmit={handleLogin} className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Email</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors"><User size={20}/></div>
                        <input 
                        type="email" 
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
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-700/50 text-white p-3.5 pl-12 pr-12 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-slate-600 hover:border-slate-600"
                        placeholder="••••••••"
                        required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors focus:outline-none">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {/* LINK DE RECUPERAÇÃO */}
                    <div className="flex justify-end pt-1">
                        <button type="button" onClick={() => setShowRecovery(true)} className="text-xs text-purple-400 hover:text-purple-300 transition-colors hover:underline">
                            Esqueci minha senha
                        </button>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 active:scale-[0.98] mt-2 group"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : (
                        <>ACESSAR SISTEMA <span className="group-hover:translate-x-1 transition-transform">→</span></>
                    )}
                </button>
            </form>

        ) : (

            // === 2. TELA DE RECUPERAÇÃO DE SENHA ===
            <form onSubmit={handleRecovery} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="text-center pb-2">
                    <h3 className="text-white font-bold text-lg flex items-center justify-center gap-2"><KeyRound size={20} className="text-purple-500"/> Recuperar Acesso</h3>
                    <p className="text-xs text-slate-400">Enviaremos um link mágico para seu e-mail.</p>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Email de Cadastro</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors"><Mail size={20}/></div>
                        <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-700/50 text-white p-3.5 pl-12 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-slate-600 hover:border-slate-600"
                        placeholder="Digite seu e-mail..."
                        autoFocus
                        required
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] mt-2"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'ENVIAR LINK DE RECUPERAÇÃO'}
                </button>

                <button type="button" onClick={() => setShowRecovery(false)} className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft size={16}/> Voltar para Login
                </button>
            </form>
        )}

        {/* RODAPÉ DO APP (PWA) */}
        {!isStandalone && !showRecovery && (
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
        
        <p className="text-center text-slate-600 text-[10px] mt-8">
          © 2026 WorkID • Tecnologia em Gestão
        </p>
      </div>
    </div>
  );
}