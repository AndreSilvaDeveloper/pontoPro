'use client';

import Link from 'next/link';
import { CheckCircle2, MessageCircle, ArrowRight, Smartphone, Users, Clock } from 'lucide-react';
import { LINKS, waLink } from '@/config/links';

export default function ObrigadoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 flex items-center justify-center p-4">
      {/* Decorative */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center space-y-8">
        {/* Sucesso */}
        <div className="space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>

          <h1 className="text-3xl font-extrabold text-white">
            Conta criada com sucesso!
          </h1>
          <p className="text-gray-400 text-lg">
            Seu periodo de teste de <span className="text-purple-400 font-bold">14 dias</span> ja comecou.
          </p>
        </div>

        {/* Proximos passos */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 text-left space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Proximos passos</h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-purple-400 text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Configure a escala dos funcionarios</p>
                <p className="text-gray-500 text-xs">Defina horarios de entrada, almoco e saida</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-purple-400 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Cadastre seus funcionarios</p>
                <p className="text-gray-500 text-xs">Eles recebem email e senha para acessar o app</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-purple-400 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Pronto! Acompanhe tudo em tempo real</p>
                <p className="text-gray-500 text-xs">Dashboard com status de quem esta trabalhando</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-500/30"
          >
            Acessar o painel <ArrowRight size={16} />
          </Link>

          <a
            href={waLink('Olá! Acabei de criar minha conta no WorkID e gostaria de ajuda para configurar.')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20BD5A] text-white py-4 rounded-xl font-bold text-sm transition-all"
          >
            <MessageCircle size={16} /> Preciso de ajuda para configurar
          </a>
        </div>

        {/* Dica */}
        <p className="text-gray-600 text-xs">
          Precisa de ajuda? Estamos no WhatsApp para te guiar na configuracao.
        </p>
      </div>
    </div>
  );
}
