'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, ArrowUp, MoreVertical } from 'lucide-react';

export default function InstallPrompt() {
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [dispensado, setDispensado] = useState(true);
  const [browserInfo, setBrowserInfo] = useState<'safari' | 'chrome-ios' | 'android' | 'desktop' | 'outro'>('outro');

  useEffect(() => {
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');

    setIsStandalone(isRunningStandalone);
    if (isRunningStandalone) return;

    // Detecta browser e plataforma
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = isIos && /safari/.test(ua) && !/crios|fxios|opios|edgios/.test(ua);
    const isChromeIos = isIos && /crios/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isSafari) {
      setBrowserInfo('safari');
    } else if (isChromeIos) {
      setBrowserInfo('chrome-ios');
    } else if (isAndroid) {
      setBrowserInfo('android');
    } else if (!isIos) {
      setBrowserInfo('desktop');
    } else {
      setBrowserInfo('outro');
    }

    // Mostra sempre que não está instalado (sem expiração)
    setDispensado(false);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setDispensado(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isStandalone || dispensado) return null;

  return (
    <>
      {/* Banner persistente */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl shrink-0 border border-indigo-500/30">
            <Smartphone size={22} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">Instale o WorkID no seu celular</p>
            <p className="text-xs text-text-muted mt-0.5">
              Para bater ponto com mais rapidez e receber notificações.
            </p>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="w-full mt-3 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
        >
          <Download size={18} />
          {browserInfo === 'safari' || browserInfo === 'chrome-ios' ? 'Como instalar' : 'Instalar agora'}
        </button>
      </div>

      {/* Modal com instruções detalhadas */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-overlay backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-page border border-border-default w-full max-w-sm rounded-3xl relative shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[90dvh] flex flex-col overflow-hidden">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 z-10 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-center shrink-0">
              <div className="mx-auto w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                <Download size={28} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Instalar o WorkID</h3>
              <p className="text-white/70 text-sm mt-1">Siga o passo a passo abaixo</p>
            </div>

            {/* Conteúdo baseado no browser */}
            <div className="overflow-y-auto flex-1 px-6 py-5">

              {browserInfo === 'chrome-ios' && (
                <div className="space-y-4">
                  {/* Aviso: precisa do Safari */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <p className="text-sm font-bold text-amber-400 mb-1">Atenção!</p>
                    <p className="text-xs text-text-muted leading-relaxed">
                      No iPhone, a instalação só funciona pelo <span className="font-bold text-text-primary">Safari</span>.
                      Copie o link abaixo e abra no Safari:
                    </p>
                    <div className="mt-3 bg-surface rounded-xl p-3 border border-border-subtle">
                      <p className="text-xs text-purple-400 font-mono break-all select-all">
                        {typeof window !== 'undefined' ? window.location.origin : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard?.writeText(window.location.origin);
                        }
                      }}
                      className="mt-2 w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Copiar Link
                    </button>
                  </div>

                  <p className="text-xs text-text-faint text-center">Depois de abrir no Safari, siga os passos:</p>

                  {/* Passos do Safari */}
                  <PassosSafari />
                </div>
              )}

              {browserInfo === 'safari' && (
                <PassosSafari />
              )}

              {browserInfo === 'android' && (
                <div className="space-y-4">
                  <PassoItem
                    numero={1}
                    titulo="Toque no menu do navegador"
                    descricao={
                      <span>
                        Procure o ícone de <span className="font-bold text-text-primary inline-flex items-center gap-1">3 pontinhos <MoreVertical size={14} /></span> no canto superior direito da tela.
                      </span>
                    }
                  />
                  <PassoItem
                    numero={2}
                    titulo="Selecione 'Instalar app'"
                    descricao={
                      <span>
                        No menu que abrir, procure a opção <span className="font-bold text-text-primary">&quot;Instalar aplicativo&quot;</span> ou <span className="font-bold text-text-primary">&quot;Adicionar à tela inicial&quot;</span>.
                      </span>
                    }
                  />
                  <PassoItem
                    numero={3}
                    titulo="Confirme a instalação"
                    descricao={
                      <span>
                        Toque em <span className="font-bold text-text-primary">&quot;Instalar&quot;</span>. O ícone do WorkID vai aparecer na sua tela inicial, igual um app normal.
                      </span>
                    }
                  />
                </div>
              )}

              {(browserInfo === 'desktop' || browserInfo === 'outro') && (
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                    <Monitor size={32} className="text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-text-muted">
                      Para instalar o app, acesse este site pelo <span className="font-bold text-text-primary">celular</span> usando o Chrome (Android) ou Safari (iPhone).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-subtle shrink-0">
              <button
                onClick={() => setShowModal(false)}
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

function PassosSafari() {
  return (
    <div className="space-y-4">
      <PassoItem
        numero={1}
        titulo="Toque no botão Compartilhar"
        descricao={
          <span>
            Na barra inferior do Safari, toque no ícone de compartilhar:{' '}
            <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg font-bold">
              <ArrowUp size={14} /> Compartilhar
            </span>
          </span>
        }
        imagem={
          <div className="mt-2 bg-surface rounded-xl p-3 border border-border-subtle flex items-center justify-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border-2 border-blue-500/40">
              <ArrowUp size={24} className="text-blue-400" />
            </div>
            <div className="ml-3 text-left">
              <p className="text-[11px] text-text-faint">Procure este ícone</p>
              <p className="text-xs font-bold text-blue-400">na barra de baixo do Safari</p>
            </div>
          </div>
        }
      />
      <PassoItem
        numero={2}
        titulo="Selecione 'Adicionar à Tela de Início'"
        descricao={
          <span>
            Role a lista de opções para cima e toque em{' '}
            <span className="inline-flex items-center gap-1 bg-surface text-text-primary px-2 py-0.5 rounded-lg font-bold border border-border-subtle">
              <span className="text-lg leading-none">+</span> Adicionar à Tela de Início
            </span>
          </span>
        }
      />
      <PassoItem
        numero={3}
        titulo="Confirme tocando em 'Adicionar'"
        descricao={
          <span>
            No canto superior direito, toque em <span className="font-bold text-blue-400">&quot;Adicionar&quot;</span>.
            Pronto! O ícone do WorkID aparecerá na sua tela inicial.
          </span>
        }
      />
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
        <p className="text-xs text-emerald-400 font-bold">
          Depois de instalar, abra pelo ícone na tela inicial para ter a experiência completa!
        </p>
      </div>
    </div>
  );
}

function PassoItem({ numero, titulo, descricao, imagem }: {
  numero: number;
  titulo: string;
  descricao: React.ReactNode;
  imagem?: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-border-subtle">
      <div className="flex items-start gap-3">
        <span className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5 shadow-lg">
          {numero}
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-text-primary">{titulo}</p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{descricao}</p>
          {imagem}
        </div>
      </div>
    </div>
  );
}
