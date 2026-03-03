'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, History, FileText, PenTool } from 'lucide-react';

const navItems = [
  { href: '/funcionario', label: 'Ponto', icon: Clock },
  { href: '/funcionario/historico', label: 'Histórico', icon: History },
  { href: '/funcionario/ausencias', label: 'Ausências', icon: FileText },
  { href: '/funcionario/assinatura', label: 'Assinar', icon: PenTool },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
                isActive
                  ? 'text-purple-400'
                  : 'text-slate-500 active:text-slate-300'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
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
