'use client';

import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react'; // Ícones para o tutorial iOS

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está instalado (modo Standalone)
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    setIsStandalone(isRunningStandalone);

    // 2. Detecta se é iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Captura o evento de instalação nativo (Chrome/Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // Previne o banner automático feio
      setDeferredPrompt(e); // Guarda o evento para usar no botão
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Se já estiver instalado, não mostra nada
  if (isStandalone) return null;

  const handleInstallClick = async () => {
    // Lógica para iOS: Abre o modal de instruções
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Lógica para Android/Chrome: Dispara o prompt nativo
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback: Se não houver suporte, apenas avisa (raro em mobile moderno)
      alert("Para instalar, procure a opção 'Adicionar à Tela Inicial' no menu do seu navegador.");
    }
  };

  return (
    <>
      {/* Botão Principal */}
      <button 
        onClick={handleInstallClick}
        className="w-full mt-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all animate-pulse"
      >
        <Download size={20} />
        Instalar Aplicativo
      </button>

      {/* Modal de Instruções para iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
            <button 
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center text-purple-400 mb-2">
                <Download size={24} />
              </div>
              
              <h3 className="text-xl font-bold text-white">Instalar no iPhone</h3>
              <p className="text-slate-400 text-sm">O iOS não permite instalação automática. Siga os passos abaixo:</p>

              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">1</span>
                  <span>Toque no botão <span className="font-bold text-blue-400 flex items-center gap-1 inline-flex"><Share size={14}/> Compartilhar</span> abaixo na barra do navegador.</span>
                </div>
                <div className="w-full h-px bg-slate-700/50"></div>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">2</span>
                  <span>Role para cima e selecione <span className="font-bold text-white inline-flex items-center gap-1"><PlusSquare size={14}/> Adicionar à Tela de Início</span>.</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">3</span>
                  <span>Antes de Adicionar autorize a Camera.</span>
                </div>
              </div>

              <button 
                onClick={() => setShowIOSModal(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold"
              >
                Entendi
              </button>
            </div>
            
            {/* Seta decorativa apontando para baixo (para o botão share do Safari) */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full text-white animate-bounce sm:hidden">
              👇
            </div>
          </div>
        </div>
      )}
    </>
  );
}