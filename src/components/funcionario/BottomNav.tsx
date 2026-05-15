'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clock, History, FileText, MessageSquare,
  MoreHorizontal, PenTool, PenLine, LogOut, X, Lightbulb, FileSignature,
  MessageCircle,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { getNotifCount } from './NotificacaoSolicitacao';

const navFixos = [
  { href: '/funcionario', label: 'Ponto', icon: Clock, badgeKey: '' },
  { href: '/funcionario/historico', label: 'Histórico', icon: History, badgeKey: 'solicitacoes' },
  { href: '/funcionario/comunicados', label: 'Avisos', icon: MessageSquare, badgeKey: 'comunicados' },
  { href: '/funcionario/contracheques', label: 'Holerite', icon: FileText, badgeKey: 'contracheques' },
];

const navMais = [
  { href: '/funcionario/fechamentos', label: 'Fechamentos', icon: FileSignature, descricao: 'Conferir e assinar folha do mês', badgeKey: 'fechamentos' },
  { href: '/funcionario/sugestoes', label: 'Pontos que faltam', icon: Lightbulb, descricao: 'Sugestões de pontos não batidos' },
  { href: '/funcionario/ausencias', label: 'Ausências', icon: PenTool, descricao: 'Atestados e justificativas' },
  { href: '/funcionario/assinatura', label: 'Minha Assinatura', icon: PenLine, descricao: 'Cadastrar/atualizar assinatura' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [notifCount, setNotifCount] = useState(0);
  const [comunicadosNaoLidos, setComunicadosNaoLidos] = useState(0);
  const [contrachequesNovos, setContrachequesNovos] = useState(0);
  const [fechamentosPendentes, setFechamentosPendentes] = useState(0);
  const [maisAberto, setMaisAberto] = useState(false);

  useEffect(() => {
    const update = () => setNotifCount(getNotifCount());
    update();
    window.addEventListener('func-notif-update', update);
    return () => window.removeEventListener('func-notif-update', update);
  }, []);

  useEffect(() => {
    const fetchComunicados = async () => {
      try {
        const res = await fetch('/api/funcionario/comunicados');
        if (res.ok) {
          const data = await res.json();
          setComunicadosNaoLidos(Array.isArray(data) ? data.filter((c: any) => !c.lido).length : 0);
        }
      } catch {}
    };
    const fetchContracheques = async () => {
      try {
        const res = await fetch('/api/funcionario/contracheques');
        if (res.ok) {
          const data = await res.json();
          setContrachequesNovos(Array.isArray(data) ? data.filter((c: any) => !c.visualizado).length : 0);
        }
      } catch {}
    };
    const fetchFechamentos = async () => {
      try {
        const res = await fetch('/api/funcionario/fechamentos');
        if (res.ok) {
          const data = await res.json();
          setFechamentosPendentes(Array.isArray(data) ? data.filter((f: any) => f.status === 'PENDENTE').length : 0);
        }
      } catch {}
    };
    fetchComunicados();
    fetchContracheques();
    fetchFechamentos();
    window.addEventListener('comunicados-update', fetchComunicados);
    window.addEventListener('contracheques-update', fetchContracheques);
    window.addEventListener('fechamentos-update', fetchFechamentos);
    return () => {
      window.removeEventListener('comunicados-update', fetchComunicados);
      window.removeEventListener('contracheques-update', fetchContracheques);
      window.removeEventListener('fechamentos-update', fetchFechamentos);
    };
  }, []);

  useEffect(() => { setMaisAberto(false); }, [pathname]);

  const abrirSuporte = async () => {
    try {
      const r = await fetch('/api/me/contato-suporte');
      const d = await r.json();
      if (d?.ativo && d?.link) {
        window.open(d.link, '_blank', 'noopener,noreferrer');
      }
    } catch { /* silencioso */ }
    setMaisAberto(false);
  };

  const getBadge = (key: string): number => {
    if (key === 'solicitacoes') return notifCount;
    if (key === 'comunicados') return comunicadosNaoLidos;
    if (key === 'contracheques') return contrachequesNovos;
    if (key === 'fechamentos') return fechamentosPendentes;
    return 0;
  };

  return (
    <>
      <nav
        data-tour="emp-bottomnav"
        className="fixed bottom-0 left-0 right-0 z-40 bg-surface-solid/80 backdrop-blur-xl border-t border-border-default"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          {navFixos.map(({ href, label, icon: Icon, badgeKey }) => {
            const isActive = pathname === href;
            const badge = getBadge(badgeKey);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
                  isActive ? 'text-purple-400' : 'text-text-faint active:text-text-secondary'
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full animate-pulse border border-page">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-purple-400' : ''}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Botão Mais */}
          <button
            data-tour="emp-mais"
            onClick={() => setMaisAberto(true)}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
              maisAberto ? 'text-purple-400' : 'text-text-faint active:text-text-secondary'
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Mais</span>
          </button>
        </div>
      </nav>

      {/* Sheet "Mais" */}
      {maisAberto && (
        <>
          <div
            onClick={() => setMaisAberto(false)}
            className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm animate-in fade-in"
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-solid border-t border-border-default rounded-t-3xl animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h3 className="text-base font-bold text-text-primary">Mais opções</h3>
              <button
                onClick={() => setMaisAberto(false)}
                className="p-2 hover:bg-hover-bg rounded-xl text-text-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 space-y-1">
              {navMais.map(({ href, label, icon: Icon, descricao, badgeKey }) => {
                const badge = badgeKey ? getBadge(badgeKey) : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-hover-bg transition-colors"
                  >
                    <div className="relative p-2.5 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                      <Icon size={18} />
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border border-surface-solid">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{label}</p>
                      <p className="text-xs text-text-muted">{descricao}</p>
                    </div>
                  </Link>
                );
              })}

              <button
                onClick={abrirSuporte}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-500/10 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                  <MessageCircle size={18} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-emerald-300">Falar com o suporte</p>
                  <p className="text-xs text-text-muted">Abrir WhatsApp da equipe WorkID</p>
                </div>
              </button>

              <button
                onClick={() => { localStorage.removeItem('workid_rt'); signOut({ callbackUrl: '/login' }); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 shrink-0">
                  <LogOut size={18} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-red-400">Sair</p>
                  <p className="text-xs text-text-muted">Encerrar sessão</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
