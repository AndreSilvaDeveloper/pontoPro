'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, X } from 'lucide-react';

type Props = {
  /**
   * Quando true, levanta o botão pra não ficar atrás do BottomNav do app do funcionário.
   * Em desktop não há BottomNav, então o offset extra só vale em mobile (lg:bottom-6 sobrescreve).
   */
  acimaDoBottomNav?: boolean;
};

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'ativo'; link: string; telefone: string }
  | { tipo: 'inativo' };

const PREFIXO_CHAVE_OCULTO = 'workid_suporte_fab_oculto_';

export default function BotaoSuporteWhatsApp({ acimaDoBottomNav = false }: Props) {
  const { data: session } = useSession();
  // @ts-ignore — campos custom da sessão
  const userId: string | undefined = session?.user?.id;
  const chaveOculto = userId ? `${PREFIXO_CHAVE_OCULTO}${userId}` : null;

  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [aberto, setAberto] = useState(false);
  const [oculto, setOculto] = useState(false);

  // Lê preferência por usuário sempre que a sessão muda (logar com outro usuário reseta o estado).
  useEffect(() => {
    if (!chaveOculto) { setOculto(false); return; }
    try {
      setOculto(localStorage.getItem(chaveOculto) === '1');
    } catch { setOculto(false); }
  }, [chaveOculto]);

  useEffect(() => {
    if (oculto || !userId) return;
    let cancelado = false;
    fetch('/api/me/contato-suporte')
      .then(r => r.json())
      .then(d => {
        if (cancelado) return;
        if (d?.ativo && d?.link) {
          setEstado({ tipo: 'ativo', link: d.link, telefone: d.telefone || '' });
        } else {
          setEstado({ tipo: 'inativo' });
        }
      })
      .catch(() => { if (!cancelado) setEstado({ tipo: 'inativo' }); });
    return () => { cancelado = true; };
  }, [oculto, userId]);

  const ocultarPermanente = () => {
    if (chaveOculto) {
      try { localStorage.setItem(chaveOculto, '1'); } catch {}
    }
    setOculto(true);
    setAberto(false);
  };

  if (oculto || estado.tipo !== 'ativo') return null;

  // bottom-20 = 80px (acima do BottomNav de ~64px + folga); bottom-6 em desktop ou quando não há BottomNav.
  const bottomClass = acimaDoBottomNav ? 'bottom-20 lg:bottom-6' : 'bottom-6';

  return (
    <>
      {/* Tooltip/menu de ações */}
      {aberto && (
        <div
          className={`fixed right-6 ${acimaDoBottomNav ? 'bottom-36 lg:bottom-24' : 'bottom-24'} z-50 w-72 bg-surface-solid border border-border-default rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200`}
        >
          <div className="px-4 py-3 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border-b border-border-subtle flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text-primary">Fale com o suporte</h3>
              <p className="text-[11px] text-text-muted mt-0.5">Atendemos por WhatsApp em horário comercial.</p>
            </div>
            <button
              onClick={() => setAberto(false)}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-hover-bg transition-colors flex-shrink-0"
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-3">
            <a
              href={estado.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setAberto(false)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 px-4 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              <MessageCircle size={16} />
              Abrir WhatsApp
            </a>
            {estado.telefone && (
              <p className="text-center text-[11px] text-text-faint mt-2">
                ou ligue: <span className="font-mono text-text-muted">{estado.telefone}</span>
              </p>
            )}
            <button
              onClick={ocultarPermanente}
              className="w-full text-[10px] text-text-faint hover:text-text-muted mt-2 py-1 transition-colors"
              title="Esconder este botão (você ainda terá a opção no menu)"
            >
              Ocultar este botão
            </button>
          </div>
        </div>
      )}

      {/* Botão flutuante com X de fechar permanente */}
      <div className={`fixed right-6 ${bottomClass} z-50`}>
        <button
          onClick={() => setAberto(v => !v)}
          aria-label="Falar com o suporte"
          title="Falar com o suporte"
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          {aberto ? <X size={22} /> : <MessageCircle size={22} />}
        </button>
        {!aberto && (
          <button
            onClick={ocultarPermanente}
            aria-label="Ocultar botão de suporte"
            title="Ocultar este botão"
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface-solid border border-border-default text-text-muted hover:text-text-primary hover:bg-elevated-solid flex items-center justify-center transition-colors shadow-md"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </>
  );
}
