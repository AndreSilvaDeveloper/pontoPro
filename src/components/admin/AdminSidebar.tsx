'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  AlertCircle,
  ShieldAlert,
  Plane,
  FileText,
  ScrollText,
  CalendarDays,
  Megaphone,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  UserCircle,
} from 'lucide-react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';

type MenuItem = { href: string; label: string; icon: any; badge?: number; accent?: string; tour?: string };
type MenuCategory = { label: string; items: MenuItem[] };

interface Props {
  pendenciasAjuste?: number;
  pendenciasAusencia?: number;
  empresaNome?: string;
  onNovaAusencia?: () => void;
}

export default function AdminSidebar({ pendenciasAjuste = 0, pendenciasAusencia = 0, empresaNome = 'Admin', onNovaAusencia }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved === '1') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('admin_sidebar_collapsed', newVal ? '1' : '0');
  };

  // Fechar mobile quando mudar de rota
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const categories: MenuCategory[] = [
    {
      label: 'Principal',
      items: [
        { href: '/admin', label: 'Início', icon: LayoutDashboard },
        { href: '/admin/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Equipe',
      items: [
        { href: '/admin/funcionarios', label: 'Gestão da Equipe', icon: Users, accent: 'purple', tour: 'sidebar-team' },
      ],
    },
    {
      label: 'Ponto & Aprovações',
      items: [
        { href: '/admin/solicitacoes', label: 'Ajustes', icon: AlertCircle, badge: pendenciasAjuste, accent: 'purple', tour: 'sidebar-ajustes' },
        { href: '/admin/pendencias', label: 'Atestados', icon: ShieldAlert, badge: pendenciasAusencia, accent: 'amber', tour: 'sidebar-atestados' },
        { href: '/admin/comunicados', label: 'Comunicados', icon: Megaphone, accent: 'purple', tour: 'sidebar-comunicados' },
      ],
    },
    {
      label: 'Documentos',
      items: [
        { href: '/admin/contracheques', label: 'Contracheques', icon: FileText, accent: 'purple', tour: 'sidebar-contracheques' },
        { href: '/admin/relatorio-mensal', label: 'Relatório Mensal', icon: FileText },
      ],
    },
    {
      label: 'Auditoria',
      items: [
        { href: '/admin/logs', label: 'Auditoria', icon: ScrollText, tour: 'sidebar-auditoria' },
      ],
    },
    {
      label: 'Configurações',
      items: [
        { href: '/admin/feriados', label: 'Feriados', icon: CalendarDays },
        { href: '/admin/configuracoes', label: 'Configurações', icon: Settings, tour: 'sidebar-configuracoes' },
      ],
    },
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`border-b border-border-subtle ${collapsed ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <div className="bg-purple-500/20 p-1.5 rounded-lg border border-purple-500/30 shrink-0">
              <LayoutDashboard size={20} className="text-purple-400" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{empresaNome}</p>
                <p className="text-[10px] text-text-dim uppercase tracking-wider">Painel</p>
              </div>
            )}
          </Link>

          {/* Botão fechar mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Menu */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto py-1">
        {categories.map((cat) => (
          <div key={cat.label} className="mb-0.5">
            {!collapsed && (
              <p className="px-4 pt-2 pb-1 text-[10px] uppercase font-bold text-text-dim tracking-wider">
                {cat.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {cat.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-tour={item.tour}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                          : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary border border-transparent'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={18} className={active ? 'text-purple-400' : item.accent === 'purple' ? 'text-purple-400' : item.accent === 'amber' ? 'text-amber-400' : 'text-text-muted'} />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                      {collapsed && item.badge && item.badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: perfil + logout */}
      <div className={`border-t border-border-subtle shrink-0 ${collapsed ? 'p-2 space-y-0.5' : 'p-2 space-y-0.5'}`}>
        <Link
          href="/admin/perfil"
          className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all text-text-secondary hover:bg-hover-bg hover:text-text-primary ${collapsed ? 'p-2 justify-center' : 'px-3 py-2'}`}
          title={collapsed ? 'Minha Conta' : undefined}
        >
          <UserCircle size={18} />
          {!collapsed && <span>Minha Conta</span>}
        </Link>

        <button
          onClick={() => { localStorage.removeItem('workid_rt'); signOut({ callbackUrl: '/login' }); }}
          className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all text-text-secondary hover:bg-red-500/10 hover:text-red-400 ${collapsed ? 'p-2 justify-center' : 'px-3 py-2'}`}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>

        {/* Toggle collapse - desktop only */}
        <button
          onClick={toggleCollapse}
          className={`hidden lg:flex w-full items-center justify-center gap-2 py-1.5 text-text-dim hover:text-text-muted hover:bg-hover-bg rounded-xl transition-all text-xs`}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> Recolher</>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Botão mobile para abrir */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-40 p-2.5 bg-surface-solid border border-border-default rounded-xl text-text-primary shadow-lg"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <Menu size={20} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-overlay backdrop-blur-sm animate-in fade-in"
        />
      )}

      {/* Sidebar desktop */}
      <aside
        data-tour="admin-sidebar"
        className={`hidden lg:flex fixed top-0 left-0 h-screen bg-surface-solid border-r border-purple-500/10 z-30 transition-all duration-300 shadow-[8px_0_32px_rgba(0,0,0,0.45),2px_0_8px_rgba(168,85,247,0.08)] ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-surface-solid border-r border-border-default z-50 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
