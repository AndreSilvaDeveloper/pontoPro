'use client';

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Users,
  Trash2,
} from "lucide-react";
import { calcularFinanceiro } from "@/lib/saas-financeiro";
import EmpresaActions from "./EmpresaActions";

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
  const estaPago = !!(pagoAte && pagoAte >= new Date());

  const hasFiliais = empresa.filiais && empresa.filiais.length > 0;

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
          <EmpresaActions
            empresa={empresa}
            estaPago={estaPago}
            loadingPagamento={loadingPagamento}
            onOpenEquipe={onOpenEquipe}
            onOpenFatura={onOpenFatura}
            onAlternarStatus={onAlternarStatus}
            onExcluir={onExcluir}
            onConfirmarPagamento={onConfirmarPagamento}
            onVincular={onVincular}
            layout="row"
          />
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
