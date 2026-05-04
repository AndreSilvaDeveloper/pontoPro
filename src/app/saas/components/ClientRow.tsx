'use client';

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  DollarSign,
  CheckCircle,
  Ban,
  PlayCircle,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Smartphone,
  ScanFace,
  MoreVertical,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { calcularFinanceiro } from "@/lib/saas-financeiro";

type StatusTag = "ATIVO" | "TRIAL" | "INADIMPLENTE" | "BLOQUEADO";

function classificarStatus(emp: any): StatusTag {
  const now = new Date();
  if (emp.status === "BLOQUEADO") return "BLOQUEADO";
  if (emp.trialAte && new Date(emp.trialAte) > now) return "TRIAL";
  const pagoAte = emp.pagoAte ? new Date(emp.pagoAte) : null;
  const anchor = emp.billingAnchorAt ? new Date(emp.billingAnchorAt) : null;
  const estaPago = pagoAte && pagoAte >= now;
  const anchorValido = anchor && anchor >= now;
  if (!estaPago && !anchorValido && emp.status === "ATIVO") return "INADIMPLENTE";
  return "ATIVO";
}

const statusConfig: Record<StatusTag, { label: string; cls: string }> = {
  ATIVO: { label: "Ativo", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  TRIAL: { label: "Trial", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  INADIMPLENTE: { label: "Inadimplente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  BLOQUEADO: { label: "Bloqueado", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const planoConfig: Record<string, { cls: string }> = {
  STARTER: { cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  PROFESSIONAL: { cls: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  ENTERPRISE: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

type Props = {
  empresa: any;
  loadingPagamento: string | null;
  onOpenEquipe: (emp: any) => void;
  onOpenFatura: (emp: any) => void;
  onAlternarStatus: (id: string, nome: string, status: string) => void;
  onExcluir: (id: string, nome: string) => void;
  onConfirmarPagamento: (id: string) => void;
  onVincular: (emp: any) => void;
};

export { classificarStatus };

export default function ClientRow({
  empresa,
  loadingPagamento,
  onOpenEquipe,
  onOpenFatura,
  onAlternarStatus,
  onExcluir,
  onConfirmarPagamento,
  onVincular,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const fin = calcularFinanceiro(empresa);
  const status = classificarStatus(empresa);
  const sCfg = statusConfig[status];
  const pCfg = planoConfig[empresa.plano] || planoConfig.PROFESSIONAL;
  const planoNome = empresa.plano || "PROFESSIONAL";

  const pagoAte = empresa.pagoAte ? new Date(empresa.pagoAte) : null;
  const estaPago = pagoAte && pagoAte >= new Date();

  const hasFiliais = empresa.filiais && empresa.filiais.length > 0;

  const [togglingTotem, setTogglingTotem] = useState(false);
  const [reindexando, setReindexando] = useState(false);
  const [addonTotem, setAddonTotem] = useState<boolean>(empresa.addonTotem === true);
  const [menuAberto, setMenuAberto] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => { setMontado(true); }, []);

  useLayoutEffect(() => {
    if (!menuAberto || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
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

  const formatDate = (d: any) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("pt-BR");
    } catch {
      return "—";
    }
  };

  return (
    <>
      {/* Main row */}
      <tr className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
        {/* Empresa */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasFiliais ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-[14px]" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate max-w-[200px]" title={empresa.nome}>
                {empresa.nome}
              </p>
              <p className="text-[10px] text-slate-500">{empresa.cnpj || "Sem CNPJ"}</p>
            </div>
          </div>
        </td>

        {/* Plano */}
        <td className="px-4 py-3">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${pCfg.cls}`}>
            {planoNome}
          </span>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${sCfg.cls}`}>
            {sCfg.label}
          </span>
        </td>

        {/* Funcs */}
        <td className="px-4 py-3 text-center text-sm text-slate-300">{fin.totalVidas}</td>

        {/* Admins */}
        <td className="px-4 py-3 text-center text-sm text-slate-300">{fin.totalAdmins}</td>

        {/* Vencimento */}
        <td className="px-4 py-3 text-xs text-slate-400">
          {empresa.trialAte && new Date(empresa.trialAte) > new Date()
            ? `Trial até ${formatDate(empresa.trialAte)}`
            : formatDate(empresa.pagoAte || empresa.billingAnchorAt)}
        </td>

        {/* Valor */}
        <td className="px-4 py-3 text-right">
          {estaPago ? (
            <span className="text-xs text-emerald-400 font-bold">PAGO</span>
          ) : (
            <div className="flex flex-col items-end leading-tight">
              <span className="text-sm font-bold text-emerald-400">
                {fin.valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {fin.precoNegociado && (
                <span
                  className="text-[9px] text-amber-300 font-semibold uppercase tracking-wider"
                  title="Preço negociado vigente — substitui o valor de tabela do plano"
                >
                  negociado
                </span>
              )}
            </div>
          )}
        </td>

        {/* Ações */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-1 justify-end">
            {/* Ações primárias (mais usadas) com label visível */}
            <button
              onClick={() => onOpenEquipe(empresa)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-600/15 rounded-lg border border-blue-500/20 transition-colors"
            >
              <Users size={13} /> <span className="hidden lg:inline">Equipe</span>
            </button>
            <button
              onClick={() => onOpenFatura(empresa)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/15 rounded-lg border border-emerald-500/20 transition-colors"
            >
              <DollarSign size={13} /> <span className="hidden lg:inline">Fatura</span>
            </button>

            {/* Menu de ações secundárias */}
            <button
              ref={triggerRef}
              onClick={() => setMenuAberto(v => !v)}
              className={`p-2 rounded-lg border transition-colors ${menuAberto ? 'bg-hover-bg border-border-default text-text-primary' : 'border-border-subtle text-text-muted hover:text-text-primary hover:bg-hover-bg'}`}
              title="Mais opções"
              aria-label="Mais opções"
            >
              <MoreVertical size={14} />
            </button>

            {montado && menuAberto && menuPos && createPortal(
              <div
                ref={menuRef}
                style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
                className="w-60 bg-page border border-border-default rounded-xl shadow-2xl z-[60] py-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
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

                <div className="my-1 border-t border-border-subtle" />

                <button
                  onClick={() => { toggleTotem(); }}
                  disabled={togglingTotem}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-cyan-600/10 hover:text-cyan-400 transition-colors disabled:opacity-50 text-left"
                >
                  {togglingTotem
                    ? <Loader2 className="animate-spin shrink-0" size={14} />
                    : <Smartphone size={14} className={`shrink-0 ${addonTotem ? 'text-cyan-400' : 'text-text-faint'}`} />}
                  <span className="flex-1">Modo Totem</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${addonTotem ? 'bg-cyan-500/20 text-cyan-300' : 'bg-elevated text-text-faint'}`}>
                    {addonTotem ? 'ATIVO' : 'OFF'}
                  </span>
                </button>

                {addonTotem && (
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
          </div>
        </td>
      </tr>

      {/* Filiais expandidas */}
      {expanded && hasFiliais && empresa.filiais.map((filial: any) => {
        const fStatus = classificarStatus(filial);
        const fsCfg = statusConfig[fStatus];
        return (
          <tr key={filial.id} className="bg-white/[0.01] border-b border-white/5">
            <td className="px-4 py-2 pl-12">
              <div className="flex items-center gap-2 border-l-2 border-slate-700 pl-3">
                <div>
                  <p className="text-xs text-slate-300">{filial.nome}</p>
                  <p className="text-[10px] text-slate-600">{filial.cnpj || "Sem CNPJ"}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${(planoConfig[filial.plano] || planoConfig.PROFESSIONAL).cls}`}>
                {filial.plano || "PROFESSIONAL"}
              </span>
            </td>
            <td className="px-4 py-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${fsCfg.cls}`}>
                {fsCfg.label}
              </span>
            </td>
            <td className="px-4 py-2 text-center text-xs text-slate-400">{filial._count?.usuarios || 0}</td>
            <td className="px-4 py-2 text-center text-xs text-slate-400">{filial.usuarios?.length || 0}</td>
            <td className="px-4 py-2 text-xs text-slate-500">—</td>
            <td className="px-4 py-2 text-right text-xs text-slate-500">—</td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => onOpenEquipe(filial)} className="p-1 text-blue-400 hover:bg-blue-600/20 rounded" title="Equipe Filial">
                  <Users size={12} />
                </button>
                <button onClick={() => onExcluir(filial.id, filial.nome)} className="p-1 text-red-400 hover:bg-red-600/20 rounded" title="Excluir Filial">
                  <Trash2 size={12} />
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
