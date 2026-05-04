'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  DollarSign,
  Smartphone,
  MoreVertical,
  CheckCircle,
  Settings,
  Link as LinkIcon,
  ScanFace,
  Ban,
  PlayCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type Props = {
  empresa: any;
  estaPago: boolean;
  loadingPagamento: string | null;
  onOpenEquipe: (emp: any) => void;
  onOpenFatura: (emp: any) => void;
  onAlternarStatus: (id: string, nome: string, status: string) => void;
  onExcluir: (id: string, nome: string) => void;
  onConfirmarPagamento: (id: string) => void;
  onVincular: (emp: any) => void;
  /** Layout: row (linha de tabela) ou card (mobile). */
  layout?: 'row' | 'card';
};

const MENU_HEIGHT = 320;

export default function EmpresaActions({
  empresa,
  estaPago,
  loadingPagamento,
  onOpenEquipe,
  onOpenFatura,
  onAlternarStatus,
  onExcluir,
  onConfirmarPagamento,
  onVincular,
  layout = 'row',
}: Props) {
  const [togglingTotem, setTogglingTotem] = useState(false);
  const [reindexando, setReindexando] = useState(false);
  const [addonTotem, setAddonTotem] = useState<boolean>(empresa.addonTotem === true);

  const [menuAberto, setMenuAberto] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null);
  const [montado, setMontado] = useState(false);
  const MENU_WIDTH = 240; // w-60
  const MARGIN = 8;

  useEffect(() => { setMontado(true); }, []);

  useLayoutEffect(() => {
    if (!menuAberto || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: prefere alinhar à direita do trigger; se não couber, alinha à esquerda
    let horizontal: { left?: number; right?: number };
    if (r.right - MENU_WIDTH >= MARGIN) {
      horizontal = { right: vw - r.right };
    } else {
      let left = Math.max(MARGIN, r.left);
      if (left + MENU_WIDTH > vw - MARGIN) {
        left = Math.max(MARGIN, vw - MENU_WIDTH - MARGIN);
      }
      horizontal = { left };
    }

    // Vertical: prefere abaixo; se não couber e tiver mais espaço acima, abre pra cima
    const espacoAbaixo = vh - r.bottom;
    if (espacoAbaixo < MENU_HEIGHT && r.top > espacoAbaixo) {
      setMenuPos({ bottom: vh - r.top + 6, ...horizontal });
    } else {
      setMenuPos({ top: r.bottom + 6, ...horizontal });
    }
  }, [menuAberto]);

  useEffect(() => {
    if (!menuAberto) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        menuRef.current && !menuRef.current.contains(t)
      ) setMenuAberto(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAberto(false); };
    const onScroll = () => setMenuAberto(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [menuAberto]);

  const reindexarTotem = async () => {
    if (!confirm(`Re-indexar rostos de TODOS os funcionários (com foto) de "${empresa.nome}" e filiais? Pode demorar alguns segundos.`)) return;
    setReindexando(true);
    try {
      const res = await fetch(`/api/saas/empresa/${empresa.id}/reindexar-totem`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Indexação concluída: ${data.indexados}/${data.total} OK${data.falhas ? ` · ${data.falhas} falha(s)` : ''}.`);
      } else {
        toast.error(data?.mensagem || data?.erro || 'Erro ao re-indexar.');
      }
    } catch {
      toast.error('Erro ao re-indexar.');
    } finally {
      setReindexando(false);
    }
  };

  const toggleTotem = async () => {
    const novo = !addonTotem;
    if (!confirm(`${novo ? 'Ativar' : 'Desativar'} Modo Totem para "${empresa.nome}"? (cobrança extra é negociada com o cliente)`)) return;
    setTogglingTotem(true);
    try {
      const res = await fetch(`/api/saas/empresa/${empresa.id}/addon-totem`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: novo }),
      });
      if (res.ok) {
        setAddonTotem(novo);
        toast.success(`Modo Totem ${novo ? 'ativado' : 'desativado'}.`);
      } else {
        toast.error('Erro ao alterar.');
      }
    } finally {
      setTogglingTotem(false);
    }
  };

  // Tamanhos diferentes pra row (compacto) vs card (mobile)
  const isCard = layout === 'card';
  const btnPadding = isCard ? 'px-3 py-2' : 'px-2.5 py-1.5';
  const btnTextSize = isCard ? 'text-xs' : 'text-xs';
  const iconSize = isCard ? 14 : 13;
  const labelClass = isCard ? '' : 'hidden lg:inline';

  return (
    <>
      <div className={`flex items-center gap-1.5 ${isCard ? 'flex-wrap' : 'justify-end'}`}>
        <button
          onClick={() => onOpenEquipe(empresa)}
          className={`flex items-center gap-1.5 ${btnPadding} ${btnTextSize} font-medium text-blue-400 hover:bg-blue-600/15 rounded-lg border border-blue-500/20 transition-colors`}
        >
          <Users size={iconSize} /> <span className={labelClass}>Equipe</span>
        </button>

        <button
          onClick={() => onOpenFatura(empresa)}
          className={`flex items-center gap-1.5 ${btnPadding} ${btnTextSize} font-medium text-emerald-400 hover:bg-emerald-600/15 rounded-lg border border-emerald-500/20 transition-colors`}
        >
          <DollarSign size={iconSize} /> <span className={labelClass}>Fatura</span>
        </button>

        <button
          onClick={toggleTotem}
          disabled={togglingTotem}
          className={`flex items-center gap-1.5 ${btnPadding} ${btnTextSize} font-medium rounded-lg border transition-colors disabled:opacity-50 ${addonTotem
            ? 'text-cyan-400 hover:bg-cyan-600/15 border-cyan-500/30 bg-cyan-500/5'
            : 'text-text-faint hover:text-text-secondary hover:bg-hover-bg border-border-subtle'}`}
          title={addonTotem ? 'Modo Totem ATIVO — clique para desativar' : 'Modo Totem inativo — clique para ativar (cobrança extra)'}
        >
          {togglingTotem
            ? <Loader2 className="animate-spin" size={iconSize} />
            : <Smartphone size={iconSize} />}
          <span className={labelClass}>Totem</span>
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${addonTotem ? 'bg-cyan-500/25 text-cyan-200' : 'bg-elevated text-text-faint'}`}>
            {addonTotem ? 'ON' : 'OFF'}
          </span>
        </button>

        <button
          ref={triggerRef}
          onClick={() => setMenuAberto(v => !v)}
          className={`${isCard ? 'p-2' : 'p-2'} rounded-lg border transition-colors ${menuAberto ? 'bg-hover-bg border-border-default text-text-primary' : 'border-border-subtle text-text-muted hover:text-text-primary hover:bg-hover-bg'}`}
          title="Mais opções"
          aria-label="Mais opções"
        >
          <MoreVertical size={iconSize} />
        </button>
      </div>

      {montado && menuAberto && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, right: menuPos.right }}
          className={`w-60 bg-page border border-border-default rounded-xl shadow-2xl z-[60] py-1.5 animate-in fade-in duration-150 ${menuPos.bottom !== undefined ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
        >
          {!estaPago && (
            <button
              onClick={() => { setMenuAberto(false); onConfirmarPagamento(empresa.id); }}
              disabled={loadingPagamento === empresa.id}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-emerald-600/10 hover:text-emerald-400 transition-colors disabled:opacity-50 text-left"
            >
              {loadingPagamento === empresa.id
                ? <Loader2 className="animate-spin shrink-0" size={14} />
                : <CheckCircle size={14} className="shrink-0 text-emerald-400" />}
              <span>Confirmar pagamento</span>
            </button>
          )}

          <Link
            href={`/saas/${empresa.id}`}
            onClick={() => setMenuAberto(false)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-purple-600/10 hover:text-purple-400 transition-colors"
          >
            <Settings size={14} className="shrink-0 text-purple-400" />
            <span>Configurações da empresa</span>
          </Link>

          <button
            onClick={() => { setMenuAberto(false); onVincular(empresa); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-amber-600/10 hover:text-amber-400 transition-colors text-left"
          >
            <LinkIcon size={14} className="shrink-0 text-amber-400" />
            <span>Vincular como filial...</span>
          </button>

          {addonTotem && (
            <>
              <div className="my-1 border-t border-border-subtle" />
              <button
                onClick={() => { setMenuAberto(false); reindexarTotem(); }}
                disabled={reindexando}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-cyan-600/10 hover:text-cyan-300 transition-colors disabled:opacity-50 text-left"
              >
                {reindexando
                  ? <Loader2 className="animate-spin shrink-0" size={14} />
                  : <ScanFace size={14} className="shrink-0 text-cyan-300" />}
                <span>Re-indexar rostos (AWS)</span>
              </button>
            </>
          )}

          <div className="my-1 border-t border-border-subtle" />

          <button
            onClick={() => { setMenuAberto(false); onAlternarStatus(empresa.id, empresa.nome, empresa.status); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary transition-colors text-left ${empresa.status === 'ATIVO' ? 'hover:bg-orange-600/10 hover:text-orange-400' : 'hover:bg-emerald-600/10 hover:text-emerald-400'}`}
          >
            {empresa.status === 'ATIVO'
              ? <Ban size={14} className="shrink-0 text-orange-400" />
              : <PlayCircle size={14} className="shrink-0 text-emerald-400" />}
            <span>{empresa.status === 'ATIVO' ? 'Bloquear empresa' : 'Reativar empresa'}</span>
          </button>

          <button
            onClick={() => { setMenuAberto(false); onExcluir(empresa.id, empresa.nome); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-600/10 transition-colors text-left"
          >
            <Trash2 size={14} className="shrink-0" />
            <span>Excluir empresa</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
