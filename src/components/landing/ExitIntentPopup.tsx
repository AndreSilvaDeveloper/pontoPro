'use client';

import { useState, useEffect } from 'react';
import { X, Rocket, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const STORAGE_KEY = 'workid_exit_popup_shown';

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Não mostra se já foi mostrado nesta sessão
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    // Só ativa em desktop (mobile não tem exit intent confiável)
    if (window.innerWidth < 768) return;

    const handler = (e: MouseEvent) => {
      // Detecta quando o mouse sai pela parte de cima (exit intent)
      if (e.clientY <= 5) {
        setVisible(true);
        sessionStorage.setItem(STORAGE_KEY, '1');
        document.removeEventListener('mouseout', handler);
      }
    };

    // Delay de 5s antes de ativar (não mostra imediatamente)
    const timer = setTimeout(() => {
      document.addEventListener('mouseout', handler);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseout', handler);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-br from-purple-950 to-gray-950 border border-purple-500/30 rounded-3xl p-8 shadow-2xl shadow-purple-500/20">
        {/* Fechar */}
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 text-gray-500 hover:text-white p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Conteudo */}
        <div className="text-center space-y-5">
          <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <Rocket size={32} className="text-purple-400" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white mb-2">
              Espere! Antes de ir...
            </h3>
            <p className="text-gray-400 text-sm">
              Teste o WorkID por <span className="text-purple-400 font-bold">14 dias gratis</span>. Sem cartao de credito. Cancele quando quiser.
            </p>
          </div>

          <div className="space-y-2 text-left">
            {[
              'Ponto pelo celular com GPS e foto',
              'Dashboard em tempo real',
              'Controle de horas extras automatico',
              'Relatorios PDF prontos',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <Link
            href="/signup"
            onClick={() => setVisible(false)}
            className="block w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-500/30"
          >
            Comecar gratis agora
          </Link>

          <button
            onClick={() => setVisible(false)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Nao, obrigado
          </button>
        </div>
      </div>
    </div>
  );
}
