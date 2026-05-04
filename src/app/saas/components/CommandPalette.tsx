'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Building2,
  Plus,
  UserPlus,
  Inbox,
  Handshake,
  Bell,
  FileText,
  BarChart3,
} from 'lucide-react';

type Empresa = {
  id: string;
  nome: string;
  cnpj?: string | null;
  status?: string | null;
  plano?: string | null;
};

type Acao = {
  id: string;
  label: string;
  hint?: string;
  icon: any;
  href?: string;
  onSelect?: () => void;
};

type Props = {
  empresas: Empresa[];
  onNovaVenda?: () => void;
};

export default function CommandPalette({ empresas, onNovaVenda }: Props) {
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalho global: Cmd+K (mac) ou Ctrl+K (win/linux)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setAberto(v => !v);
      }
      if (e.key === 'Escape') setAberto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (aberto) {
      setQuery('');
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [aberto]);

  const acoesFixas: Acao[] = useMemo(() => [
    { id: 'a-venda', label: 'Nova venda', hint: 'Cadastrar empresa cliente', icon: Plus, onSelect: onNovaVenda, href: onNovaVenda ? undefined : '/saas/venda' },
    { id: 'a-leads', label: 'Ver leads', hint: 'Funil de vendas', icon: Inbox, href: '/saas/leads' },
    { id: 'a-analytics', label: 'Analytics de marketing', hint: 'Visitas, signups, conversões', icon: BarChart3, href: '/saas/analytics' },
    { id: 'a-rev', label: 'Revendedores', hint: 'Parceiros', icon: Handshake, href: '/saas/revendedores' },
    { id: 'a-notif', label: 'Notificações', hint: 'Histórico completo', icon: Bell, href: '/saas/notificacoes' },
    { id: 'a-rel', label: 'Relatório PDF geral', hint: 'Baixar resumo', icon: FileText, href: '/saas?relatorio=geral' },
  ], [onNovaVenda]);

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const empresasFiltradas: Acao[] = empresas
      .filter(e => !q || e.nome?.toLowerCase().includes(q) || e.cnpj?.toLowerCase().includes(q))
      .slice(0, 10)
      .map(e => ({
        id: `e-${e.id}`,
        label: e.nome,
        hint: [e.cnpj, e.plano, e.status].filter(Boolean).join(' · '),
        icon: Building2,
        href: `/saas/${e.id}`,
      }));

    const acoesFiltradas = q
      ? acoesFixas.filter(a => a.label.toLowerCase().includes(q) || a.hint?.toLowerCase().includes(q))
      : acoesFixas;

    return [...empresasFiltradas, ...acoesFiltradas];
  }, [query, empresas, acoesFixas]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  if (!aberto) return null;

  const escolher = (a: Acao) => {
    setAberto(false);
    if (a.onSelect) a.onSelect();
    else if (a.href) router.push(a.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, resultados.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') {
      const a = resultados[highlight];
      if (a) escolher(a);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4 animate-in fade-in duration-150"
      onClick={() => setAberto(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-page border border-border-default rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
          <Search size={18} className="text-text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar empresa, ação..."
            className="flex-1 bg-transparent outline-none text-text-primary text-sm placeholder:text-text-faint"
          />
          <kbd className="text-[10px] bg-elevated px-2 py-0.5 rounded border border-border-subtle text-text-muted">ESC</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {resultados.length === 0 ? (
            <div className="px-4 py-10 text-center text-text-faint text-sm">Nada encontrado.</div>
          ) : (
            resultados.map((a, i) => {
              const Icon = a.icon;
              const ativo = i === highlight;
              return (
                <button
                  key={a.id}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => escolher(a)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    ativo ? 'bg-purple-500/10' : 'hover:bg-hover-bg'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ativo ? 'bg-purple-500/20' : 'bg-elevated'}`}>
                    <Icon size={14} className={ativo ? 'text-purple-300' : 'text-text-secondary'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{a.label}</p>
                    {a.hint && <p className="text-[11px] text-text-muted truncate">{a.hint}</p>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-border-subtle bg-elevated/30 flex items-center justify-between text-[10px] text-text-faint">
          <span><kbd className="bg-elevated px-1.5 py-0.5 rounded border border-border-subtle">↑↓</kbd> navegar · <kbd className="bg-elevated px-1.5 py-0.5 rounded border border-border-subtle">↵</kbd> abrir</span>
          <span><kbd className="bg-elevated px-1.5 py-0.5 rounded border border-border-subtle">⌘K</kbd> alternar</span>
        </div>
      </div>
    </div>
  );
}
