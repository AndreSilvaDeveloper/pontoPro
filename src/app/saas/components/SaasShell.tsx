'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import axios from 'axios';
import {
  LayoutDashboard,
  Inbox,
  CalendarClock,
  Plus,
  Handshake,
  BarChart3,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Megaphone,
  ScrollText,
  DollarSign,
  Settings,
  Package,
  Tag,
} from 'lucide-react';
import { ImpersonationBanner } from '@/components/impersonation/ImpersonationBanner';
import PushPermissionPrompt from './PushPermissionPrompt';
import PushToastListener from './PushToastListener';
import CommandPalette from './CommandPalette';

type NavItem = {
  href: string;
  label: string;
  icon: any;
  exact?: boolean;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'OPERACIONAL',
    items: [
      { href: '/saas', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/saas/notificacoes', label: 'Notificações', icon: Megaphone },
    ],
  },
  {
    title: 'VENDAS',
    items: [
      { href: '/saas/leads', label: 'Leads', icon: Inbox },
      { href: '/saas/agendamentos', label: 'Agendamentos', icon: CalendarClock },
      { href: '/saas/venda', label: 'Nova Venda', icon: Plus },
      { href: '/saas/revendedores', label: 'Revendedores', icon: Handshake },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      { href: '/saas/financeiro', label: 'Visão geral', icon: DollarSign },
      { href: '/saas/cupons', label: 'Cupons', icon: Tag },
    ],
  },
  {
    title: 'ANÁLISE',
    items: [
      { href: '/saas/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'SUPORTE',
    items: [
      { href: '/saas/logs', label: 'Logs', icon: ScrollText },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { href: '/saas/planos', label: 'Planos', icon: Package },
      { href: '/saas/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
];

const STORAGE_KEY = 'saas-sidebar-collapsed';

export default function SaasShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {}
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    axios.post('/api/saas/gestao')
      .then(r => setEmpresas(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let abortou = false;
    const carregar = async () => {
      try {
        const r = await axios.get('/api/saas/sidebar-badges');
        if (!abortou && r.data && typeof r.data === 'object') setBadges(r.data);
      } catch { /* silencioso */ }
    };
    carregar();
    const id = window.setInterval(carregar, 30_000);
    // Recarrega badges quando o sw avisa de novo push (mantém em sincronia
    // com o BellDropdown antigo, sem manter o botão visível).
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('workid-push');
      bc.addEventListener('message', carregar);
    }
    return () => {
      abortou = true;
      window.clearInterval(id);
      if (bc) { bc.removeEventListener('message', carregar); bc.close(); }
    };
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const handleSignOut = () => {
    try { localStorage.removeItem('workid_rt'); } catch {}
    signOut({ callbackUrl: '/login' });
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const expanded = mobile || !collapsed;
    return (
      <>
        <div className="h-14 flex items-center justify-between px-3 border-b border-border-subtle flex-shrink-0">
          <Link href="/saas" className="flex items-center gap-2 min-w-0">
            <Image src="/logo.png" alt="WorkID" width={28} height={28} className="rounded-md flex-shrink-0" priority />
            {expanded && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-text-primary leading-tight">WorkID</div>
                <div className="text-[9px] text-text-muted uppercase tracking-widest leading-tight">Super Admin</div>
              </div>
            )}
          </Link>
          {mobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 hover:bg-elevated rounded-lg text-text-muted"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              onClick={toggleCollapsed}
              className="p-1.5 hover:bg-elevated rounded-lg text-text-muted hidden lg:flex"
              aria-label={collapsed ? 'Expandir' : 'Colapsar'}
              title={collapsed ? 'Expandir (⌘B)' : 'Colapsar (⌘B)'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_GROUPS.map(group => (
            <div key={group.title} className="mb-4">
              {expanded && (
                <div className="px-3 mb-1.5 text-[10px] font-bold text-text-faint uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  const count = badges[item.href] || 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={!expanded ? `${item.label}${count > 0 ? ` (${count})` : ''}` : undefined}
                        className={`
                          relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                          ${active
                            ? 'bg-purple-600/15 text-purple-300 font-semibold'
                            : 'text-text-secondary hover:bg-elevated hover:text-text-primary'}
                          ${!expanded ? 'justify-center' : ''}
                        `}
                      >
                        <span className="relative flex-shrink-0">
                          <Icon size={16} />
                          {!expanded && count > 0 && (
                            <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center">
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </span>
                        {expanded && <span className="truncate">{item.label}</span>}
                        {expanded && count > 0 && (
                          <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-border-subtle flex-shrink-0">
          <button
            onClick={handleSignOut}
            title={!expanded ? 'Sair' : undefined}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted
              hover:bg-red-500/10 hover:text-red-400 transition-colors
              ${!expanded ? 'justify-center' : ''}
            `}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {expanded && <span>Sair</span>}
          </button>
        </div>
      </>
    );
  };

  const sidebarWidthClass = collapsed ? 'lg:w-16' : 'lg:w-60';
  const mainOffsetClass = collapsed ? 'lg:ml-16' : 'lg:ml-60';

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <ImpersonationBanner />
      <PushPermissionPrompt />
      <PushToastListener />
      <CommandPalette empresas={empresas} />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orb-purple rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <aside
        className={`hidden lg:flex ${sidebarWidthClass} flex-col fixed inset-y-0 left-0 z-30 bg-page/90 backdrop-blur-xl border-r border-border-subtle transition-[width] duration-200`}
      >
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-page border-r border-border-subtle lg:hidden animate-in slide-in-from-left duration-200">
            <SidebarContent mobile />
          </aside>
        </>
      )}

      <div className={`flex-1 min-w-0 ${mainOffsetClass} transition-[margin] duration-200`}>
        <header className="lg:hidden sticky top-0 z-20 h-14 bg-page/80 backdrop-blur-xl border-b border-border-subtle flex items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-elevated rounded-lg text-text-secondary"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <Link href="/saas" className="lg:hidden flex items-center gap-2">
              <Image src="/logo.png" alt="WorkID" width={24} height={24} className="rounded-md" />
              <span className="font-bold text-sm">WorkID</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2" />

        </header>

        <main className="relative z-10">{children}</main>
      </div>
    </div>
  );
}
