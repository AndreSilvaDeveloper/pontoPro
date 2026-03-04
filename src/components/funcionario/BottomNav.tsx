'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, History, FileText, PenTool } from 'lucide-react';
import { getNotifCount } from './NotificacaoSolicitacao';

const navItems = [
  { href: '/funcionario', label: 'Ponto', icon: Clock, badge: false },
  { href: '/funcionario/historico', label: 'Histórico', icon: History, badge: true },
  { href: '/funcionario/ausencias', label: 'Ausências', icon: FileText, badge: false },
  { href: '/funcionario/assinatura', label: 'Assinar', icon: PenTool, badge: false },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const update = () => setNotifCount(getNotifCount());
    update();

    window.addEventListener('func-notif-update', update);
    return () => window.removeEventListener('func-notif-update', update);
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface-solid/80 backdrop-blur-xl border-t border-border-default"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href;
          const showBadge = badge && notifCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
                isActive
                  ? 'text-purple-400'
                  : 'text-text-faint active:text-text-secondary'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full animate-pulse border border-page">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-purple-400' : ''}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
