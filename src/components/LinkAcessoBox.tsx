'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle } from 'lucide-react';

/**
 * Caixinha pra entregar o link de ativação do funcionário:
 * mostra a URL, botão "Copiar" e botão "Abrir no WhatsApp" com a mensagem pronta.
 */
export default function LinkAcessoBox({
  link,
  nome,
  textoAntes = 'Para usar o sistema de ponto, abra este link e crie a sua senha',
}: {
  link: string;
  nome?: string;
  /** Trecho da mensagem do WhatsApp antes do link (sem "Olá nome!" e sem o link). */
  textoAntes?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* navegador antigo: o usuário ainda pode selecionar o texto do input */
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const primeiro = (nome || '').trim().split(/\s+/)[0] || '';
  const mensagem = `Olá${primeiro ? ' ' + primeiro : ''}! ${textoAntes}: ${link}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  return (
    <div className="space-y-2">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full bg-page border border-border-input rounded-xl px-3 py-2.5 text-xs text-text-secondary outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copiar}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-colors active:scale-95"
        >
          {copiado ? (<><Check size={16} /> Copiado!</>) : (<><Copy size={16} /> Copiar link</>)}
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors active:scale-95"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
      </div>
    </div>
  );
}
