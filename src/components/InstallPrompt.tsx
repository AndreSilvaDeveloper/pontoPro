'use client';

import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');

    setIsStandalone(isRunningStandalone);

    if (isRunningStandalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Verifica se já dispensou (expira em 7 dias)
    const jaDispensou = localStorage.getItem('install_prompt_dispensado');
    if (jaDispensou) {
      const expira = parseInt(jaDispensou);
      if (Date.now() < expira) return;
    }

    const timer = setTimeout(() => setDispensado(false), 2000);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const dispensar = () => {
    // Dispensa por 7 dias
    localStorage.setItem('install_prompt_dispensado', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setDispensado(true);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setDispensado(true);
      }
    } else {
      setShowIOSModal(true);
    }
  };

  if (isStandalone || dispensado) return null;

  return (
    <>
      <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="bg-indigo-500/20 p-2 rounded-xl shrink-0">
          <Smartphone size={20} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary">Instalar o WorkID</p>
          <p className="text-xs text-text-muted mt-0.5">
            {isIOS
              ? 'Adicione à tela inicial para acesso rápido e notificações.'
              : 'Instale o app para acesso rápido e receber notificações.'
            }
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            {isIOS ? 'Como instalar' : 'Instalar'}
          </button>
          <button
            onClick={dispensar}
            className="p-1.5 text-text-faint hover:text-text-muted transition-colors rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Modal iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-overlay backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-page border border-border-default w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                <Download size={24} className="text-indigo-400" />
              </div>

              <h3 className="text-lg font-bold text-text-primary">
                {isIOS ? 'Instalar no iPhone' : 'Instalar o App'}
              </h3>
              <p className="text-text-muted text-sm">Siga os passos abaixo:</p>

              <div className="bg-surface rounded-2xl p-4 space-y-3 text-left border border-border-subtle">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">1</span>
                      <span>Toque no botão <span className="font-bold text-blue-400 inline-flex items-center gap-1"><Share size={13}/> Compartilhar</span> na barra do Safari.</span>
                    </div>
                    <div className="w-full h-px bg-border-subtle" />
                    <div className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">2</span>
                      <span>Selecione <span className="font-bold text-text-primary inline-flex items-center gap-1"><PlusSquare size={13}/> Adicionar à Tela de Início</span>.</span>
                    </div>
                    <div className="w-full h-px bg-border-subtle" />
                    <div className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">3</span>
                      <span>Toque em <span className="font-bold text-text-primary">Adicionar</span> e autorize a câmera.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">1</span>
                      <span>Toque no menu <span className="font-bold text-text-primary">(3 pontinhos)</span> do navegador.</span>
                    </div>
                    <div className="w-full h-px bg-border-subtle" />
                    <div className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">2</span>
                      <span>Selecione <span className="font-bold text-text-primary">Adicionar à tela inicial</span> ou <span className="font-bold text-text-primary">Instalar app</span>.</span>
                    </div>
                    <div className="w-full h-px bg-border-subtle" />
                    <div className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">3</span>
                      <span>Confirme tocando em <span className="font-bold text-text-primary">Instalar</span>.</span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => { setShowIOSModal(false); dispensar(); }}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg"
              >
                Entendi!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
