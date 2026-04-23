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
  Clock,
  MapPin,
  Camera,
  FileText,
  TrendingUp,
  CheckCircle2,
  Sparkles,
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
  const [restaurando, setRestaurando] = useState(true);
  const [showRecovery, setShowRecovery] = useState(false);
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');

  useEffect(() => {
    const rt = localStorage.getItem('workid_rt');
    if (!rt) { setRestaurando(false); return; }

    fetch('/api/auth/auto-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const dest = data.cargo === 'ADMIN' ? '/admin' : '/funcionario';
          window.location.href = dest;
        } else {
          localStorage.removeItem('workid_rt');
          setRestaurando(false);
        }
      })
      .catch(() => setRestaurando(false));
  }, []);

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
        twoFactorCode: twoFACode,
      });

      if (result?.error) {
        if (result.error === '2FA_REQUIRED') {
          setTwoFARequired(true);
          toast.dismiss(toastId);
          toast.info('Digite o código do seu app autenticador.');
          setLoading(false);
          return;
        }
        if (result.error === '2FA_INVALID') {
          toast.error('Código inválido. Tente novamente.', { id: toastId });
          setLoading(false);
          return;
        }
        toast.error('E-mail ou senha inválidos.', { id: toastId });
        setLoading(false);
        return;
      }

      try {
        sessionStorage.removeItem(FIN_ALERT_DISMISS_KEY);
      } catch {}

      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();

      try {
        if (sessionData?.user?.id) {
          const rtRes = await fetch('/api/auth/auto-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: sessionData.user.id }),
          });
          const rtData = await rtRes.json();
          if (rtData.refreshToken) {
            localStorage.setItem('workid_rt', rtData.refreshToken);
          }
        }
      } catch {}

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

  if (restaurando) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-page gap-3">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-muted">Entrando...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] w-full relative overflow-hidden bg-page selection:bg-purple-500/30"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      {/* Background animado (orbs usam cor do tema pra não lavar no light) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-orb-purple rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-orb-indigo rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      {/* Modal tutorial PWA (preservado) */}
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

      {/* Layout split */}
      <div className="relative z-10 min-h-[100dvh] grid lg:grid-cols-2">
        {/* === COLUNA ESQUERDA: HERO (desktop only) === */}
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative">
          <div className="self-start">
            <img
              src="/logo.png"
              alt="WorkID"
              className="h-12 w-auto object-contain object-left select-none"
              draggable={false}
            />
          </div>

          {/* Hero content */}
          <div className="space-y-8 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <Sparkles size={14} className="text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">Validade jurídica · Portaria 671</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-text-primary leading-[1.2] tracking-tight">
              O ponto eletrônico que{' '}
              <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent font-extrabold">
                cabe no bolso
              </span>
              {' '}da sua equipe.
            </h1>

            <p className="text-lg text-text-muted leading-relaxed">
              GPS, reconhecimento facial, banco de horas, holerite digital e auditoria — tudo em um lugar, em tempo real.
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                { icon: MapPin, label: 'Geofence GPS', desc: 'Só bate no local certo' },
                { icon: Camera, label: 'Reconhecimento', desc: 'Facial com AWS' },
                { icon: Clock, label: 'Banco de Horas', desc: 'Cálculo automático' },
                { icon: FileText, label: 'Holerite Digital', desc: 'Assinatura no PDF' },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 p-3 rounded-xl bg-surface/60 border border-border-subtle hover:border-purple-500/30 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
                    <Icon size={16} className="text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{label}</p>
                    <p className="text-[11px] text-text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 pt-2 text-xs text-text-faint">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>LGPD compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>SSL 256-bit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-emerald-400" />
                <span>99.9% uptime</span>
              </div>
            </div>
          </div>

          {/* Footer esquerda */}
          <p className="text-xs text-text-dim">
            © 2026 WorkID · <a href="/privacidade" className="hover:text-text-muted underline">Privacidade</a> · <a href="/termos" className="hover:text-text-muted underline">Termos</a>
          </p>
        </div>

        {/* === COLUNA DIREITA: FORM === */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-12 relative">
          <div className="w-full max-w-md">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-6">
              <img
                src="/logo.png"
                alt="WorkID"
                className="w-28 h-28 object-contain mx-auto select-none drop-shadow-[0_8px_32px_rgba(168,85,247,0.3)]"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onTouchStart={(e) => {
                  const timer = setTimeout(() => { window.location.href = '/push-debug'; }, 3000);
                  const cancel = () => clearTimeout(timer);
                  e.currentTarget.addEventListener('touchend', cancel, { once: true });
                  e.currentTarget.addEventListener('touchmove', cancel, { once: true });
                }}
              />
            </div>

            {/* Card com glass effect */}
            <div className="bg-surface/70 backdrop-blur-2xl border border-border-default rounded-3xl shadow-[0_20px_80px_-20px_rgba(168,85,247,0.25)] p-6 sm:p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
              {/* Shine effect no topo */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

              {!showRecovery ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-text-primary tracking-tight">Bem-vindo de volta</h2>
                    <p className="text-sm text-text-muted mt-1">Entre com seu e-mail e senha</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-text-muted ml-1 uppercase tracking-wider">Email</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint group-focus-within:text-purple-400 transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-page/60 border border-border-input text-text-primary py-3.5 pl-12 pr-4 rounded-xl focus:border-purple-500 focus:bg-page outline-none transition-all placeholder:text-text-dim"
                          placeholder="seu@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-text-muted ml-1 uppercase tracking-wider">Senha</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint group-focus-within:text-purple-400 transition-colors">
                          <ShieldCheck size={18} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-page/60 border border-border-input text-text-primary py-3.5 pl-12 pr-12 rounded-xl focus:border-purple-500 focus:bg-page outline-none transition-all placeholder:text-text-dim"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowRecovery(true)}
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                    </div>

                    {twoFARequired && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[11px] font-bold text-purple-300 ml-1 uppercase tracking-wider">
                          Código 2FA
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={8}
                          autoFocus
                          value={twoFACode}
                          onChange={(e) => setTwoFACode(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                          placeholder="Digite o código de 6 dígitos"
                          className="w-full bg-page/60 border border-purple-500/40 text-text-primary py-3.5 px-4 rounded-xl focus:border-purple-500 focus:bg-page outline-none transition-all placeholder:text-text-dim text-center font-mono tracking-widest text-lg"
                        />
                        <p className="text-[11px] text-text-muted ml-1">
                          Use seu app autenticador ou um código de backup.
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="relative w-full overflow-hidden bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_24px_-8px_rgba(168,85,247,0.5)] hover:shadow-[0_12px_32px_-8px_rgba(168,85,247,0.7)] active:scale-[0.98] mt-2 group"
                    >
                      {/* Shine effect */}
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <span className="relative flex items-center justify-center gap-2">
                        {loading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            Entrar
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                </>
              ) : (
                <form onSubmit={handleRecovery} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="mb-2">
                    <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                      <KeyRound size={22} className="text-purple-400" />
                      Recuperar acesso
                    </h2>
                    <p className="text-sm text-text-muted mt-1">Enviaremos um link para redefinir sua senha.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-muted ml-1 uppercase tracking-wider">E-mail de cadastro</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint group-focus-within:text-purple-400 transition-colors">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-page/60 border border-border-input text-text-primary py-3.5 pl-12 pr-4 rounded-xl focus:border-purple-500 focus:bg-page outline-none transition-all placeholder:text-text-dim"
                        placeholder="Digite seu e-mail..."
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-purple-900/30 active:scale-[0.98]"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Enviar link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRecovery(false)}
                    className="w-full text-text-muted hover:text-text-primary text-sm py-2 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={16} /> Voltar
                  </button>
                </form>
              )}

              {!isStandalone && !showRecovery && (
                <div className="pt-6 mt-6 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full bg-page/40 hover:bg-page/70 border border-border-input hover:border-purple-500/40 text-text-secondary hover:text-text-primary font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2.5 text-sm group"
                  >
                    <Smartphone size={16} className="text-purple-400" />
                    {isIOS ? 'Instalar no iPhone' : 'Instalar aplicativo'}
                  </button>
                </div>
              )}
            </div>

            {/* Footer mobile */}
            <p className="lg:hidden text-center text-text-dim text-[10px] mt-6">
              © 2026 WorkID · <a href="/privacidade" className="hover:text-text-muted underline">Privacidade</a> · <a href="/termos" className="hover:text-text-muted underline">Termos</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
