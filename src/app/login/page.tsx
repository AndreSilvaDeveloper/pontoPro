'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  ShieldCheck,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';

const STORAGE_KEY = 'workid_billing_block';
const FIN_ALERT_DISMISS_KEY = 'workid_admin_finance_alert_dismissed_v1';

function base64UrlEncodeUtf8(obj: any) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showRecovery, setShowRecovery] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showTutorial, setShowTutorial] = useState<'IOS' | 'ANDROID_GENERIC' | null>(null);

  useEffect(() => {
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

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

  // ✅ LOGIN (corrigido)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading('Autenticando credenciais...');
    sessionStorage.removeItem('workid_billing_alert_ok');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        toast.error('E-mail ou senha inválidos.', { id: toastId });
        setLoading(false);
        return;
      }

      try {
        sessionStorage.removeItem(FIN_ALERT_DISMISS_KEY);
      } catch {}

      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();

      // Verifica bloqueio financeiro após login (sessão já criada)
      if (sessionData?.error === 'BILLING_BLOCK') {
        const blockPayload = base64UrlEncodeUtf8({
          code: 'BLOCKED',
          motivo: 'Acesso suspenso por pendência financeira.',
          empresaNome: sessionData?.billing?.empresaNome || '',
          email: email.trim().toLowerCase(),
          cargo: sessionData?.user?.cargo || null,
        });
        sessionStorage.setItem(STORAGE_KEY, blockPayload);
        toast.dismiss(toastId);
        setLoading(false);
        router.push('/acesso_bloqueado');
        return;
      }

      toast.success('Login autorizado! Entrando...', { id: toastId });

      if (sessionData?.user?.cargo === 'SUPER_ADMIN') router.push('/saas');
      else if (sessionData?.user?.cargo === 'REVENDEDOR') router.push('/revendedor');
      else if (sessionData?.user?.cargo === 'ADMIN') router.push('/admin');
      else router.push('/funcionario');
    } catch {
      toast.error('Erro de conexão.', { id: toastId });
      setLoading(false);
    }
  };

  // === RECUPERAR SENHA ===
  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.warning('Digite seu e-mail.');

    setLoading(true);
    const toastId = toast.loading('Enviando link de recuperação...');

    try {
      await fetch('/api/auth/esqueci-senha', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
      });

      toast.success('Se o e-mail existir, enviamos um link para você!', { id: toastId, duration: 5000 });
      setShowRecovery(false);
      setPassword('');
    } catch {
      toast.error('Erro ao tentar enviar e-mail.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 relative overflow-hidden bg-page selection:bg-purple-500/30" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Efeitos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      {/* MODAL DE TUTORIAL PWA */}
      {showTutorial && (
        <div
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-300"
          onClick={() => setShowTutorial(null)}
        >
          <div
            className="bg-surface-solid border border-border-default rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 w-full sm:max-w-sm sm:mx-4 space-y-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTutorial(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
            >
              &times;
            </button>

            {showTutorial === 'IOS' ? (
              <>
                <div className="text-center space-y-1 pt-1">
                  <div className="inline-flex items-center justify-center p-2.5 mb-2 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <Smartphone size={24} className="text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">Instalar no iPhone</h3>
                  <p className="text-xs text-text-muted">Use o <strong className="text-blue-400">Safari</strong> para instalar</p>
                </div>

                <div className="space-y-0">
                  {/* Passo 1 */}
                  <div className="flex gap-3 p-3">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">1</div>
                      <div className="w-px flex-1 bg-border-input/50 mt-1" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-text-primary">Toque no botão <strong className="text-blue-400">Compartilhar</strong></p>
                      <p className="text-xs text-text-faint mt-0.5">O ícone fica na barra inferior do Safari</p>
                      <div className="mt-2 flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl py-2.5 px-4">
                        <Share size={20} className="text-blue-400" />
                        <span className="text-xs text-blue-300 font-medium">Botão de compartilhar</span>
                      </div>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex gap-3 p-3">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">2</div>
                      <div className="w-px flex-1 bg-border-input/50 mt-1" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-text-primary">Role e toque em <strong className="text-blue-400">Adicionar à Tela de Início</strong></p>
                      <p className="text-xs text-text-faint mt-0.5">Role a lista de opções para baixo</p>
                      <div className="mt-2 flex items-center gap-2.5 bg-hover-bg border border-border-default rounded-xl py-2.5 px-4">
                        <PlusSquare size={18} className="text-text-primary" />
                        <span className="text-xs text-text-secondary font-medium">Tela de Início</span>
                      </div>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex gap-3 p-3">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">3</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">Toque em <strong className="text-emerald-400">Adicionar</strong></p>
                      <p className="text-xs text-text-faint mt-0.5">O app WorkID aparecerá na sua tela inicial</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-1 pt-1">
                  <div className="inline-flex items-center justify-center p-2.5 mb-2 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <Smartphone size={24} className="text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">Instalar Aplicativo</h3>
                  <p className="text-xs text-text-muted">Adicione o WorkID à sua tela inicial</p>
                </div>

                <div className="space-y-0">
                  <div className="flex gap-3 p-3">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">1</div>
                      <div className="w-px flex-1 bg-border-input/50 mt-1" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-text-primary">Toque no <strong className="text-purple-400">Menu</strong> do navegador</p>
                      <p className="text-xs text-text-faint mt-0.5">Os três pontinhos no canto superior</p>
                      <div className="mt-2 flex items-center justify-center gap-2 bg-hover-bg border border-border-default rounded-xl py-2.5 px-4">
                        <MoreVertical size={20} className="text-text-secondary" />
                        <span className="text-xs text-text-muted font-medium">Menu do navegador</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">2</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">Selecione <strong className="text-emerald-400">Instalar aplicativo</strong></p>
                      <p className="text-xs text-text-faint mt-0.5">O app será instalado automaticamente</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setShowTutorial(null)}
              className="w-full bg-white text-slate-950 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors text-sm"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* CARD PRINCIPAL */}
      <div className="w-full max-w-md p-6 sm:p-8 bg-page backdrop-blur-xl border border-border-default rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* CABEÇALHO */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="WorkID"
            className="w-32 h-32 sm:w-36 sm:h-36 object-contain mb-2 mx-auto select-none"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={(e) => {
              const timer = setTimeout(() => { window.location.href = '/push-debug'; }, 3000);
              const cancel = () => clearTimeout(timer);
              e.currentTarget.addEventListener('touchend', cancel, { once: true });
              e.currentTarget.addEventListener('touchmove', cancel, { once: true });
            }}
          />
          <p className="text-text-muted text-sm">Gestão Inteligente de Ponto</p>
        </div>

        {!showRecovery ? (
          <form onSubmit={handleLogin} className="space-y-5 animate-in slide-in-from-left-4 duration-300">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted ml-1 uppercase tracking-wider">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-text-faint group-focus-within:text-purple-400 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-page border border-border-input text-text-primary p-3.5 pl-12 rounded-xl focus:border-purple-500 outline-none transition-colors placeholder:text-text-dim hover:border-border-input"
                  placeholder="exemplo@workid.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted ml-1 uppercase tracking-wider">Senha</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-text-faint group-focus-within:text-purple-400 transition-colors">
                  <ShieldCheck size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-page border border-border-input text-text-primary p-3.5 pl-12 pr-12 rounded-xl focus:border-purple-500 outline-none transition-colors placeholder:text-text-dim hover:border-border-input"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-text-faint hover:text-text-primary transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 active:scale-95 mt-2 group"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  ACESSAR SISTEMA <span className="group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRecovery} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center pb-2">
              <h3 className="text-text-primary font-bold text-lg flex items-center justify-center gap-2">
                <KeyRound size={20} className="text-purple-500" /> Recuperar Acesso
              </h3>
              <p className="text-xs text-text-muted">Enviaremos um link mágico para seu e-mail.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted ml-1 uppercase tracking-wider">Email de Cadastro</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-text-faint group-focus-within:text-purple-400 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-page border border-border-input text-text-primary p-3.5 pl-12 rounded-xl focus:border-purple-500 outline-none transition-colors placeholder:text-text-dim hover:border-border-input"
                  placeholder="Digite seu e-mail..."
                  autoFocus
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg active:scale-95 mt-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'ENVIAR LINK DE RECUPERAÇÃO'}
            </button>

            <button
              type="button"
              onClick={() => setShowRecovery(false)}
              className="w-full text-text-muted hover:text-text-primary text-sm py-2 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Voltar para Login
            </button>
          </form>
        )}

        {!isStandalone && !showRecovery && (
          <div className="pt-6 mt-2">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border-input/50"></div>
              <span className="flex-shrink-0 mx-4 text-text-faint text-[10px] uppercase tracking-widest">Instalar App</span>
              <div className="flex-grow border-t border-border-input/50"></div>
            </div>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full bg-elevated hover:bg-elevated-solid text-text-secondary border border-border-input/50 hover:border-purple-500/30 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 text-sm mt-2 group"
            >
              <div className="bg-border-input p-1.5 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Smartphone size={16} />
              </div>
              {isIOS ? 'Instalar no iPhone' : 'Instalar Aplicativo'}
            </button>
          </div>
        )}

        <p className="text-center text-text-dim text-[10px] mt-8">© 2026 WorkID • Tecnologia em Gestão</p>
      </div>
    </div>
  );
}
