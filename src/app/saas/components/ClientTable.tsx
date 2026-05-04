'use client';

import { useState, useMemo, useEffect } from "react";
import { RefreshCw, Search, Loader2 } from "lucide-react";
import ClientRow, { classificarStatus } from "./ClientRow";
import EmpresaActions from "./EmpresaActions";

type StatusFilter = "TODOS" | "ATIVO" | "TRIAL" | "INADIMPLENTE" | "BLOQUEADO";

type Props = {
  empresas: any[];
  loading: boolean;
  loadingPagamento: string | null;
  onRefresh: () => void;
  onOpenEquipe: (emp: any) => void;
  onOpenFatura: (emp: any) => void;
  onAlternarStatus: (id: string, nome: string, status: string) => void;
  onExcluir: (id: string, nome: string) => void;
  onConfirmarPagamento: (id: string) => void;
  onVincular: (emp: any) => void;
};

type SortKey = "nome" | "plano" | "status" | "funcs" | "admins" | "valor";
type SortDir = "asc" | "desc";

const statusTabs: { key: StatusFilter; label: string; color: string }[] = [
  { key: "TODOS", label: "Todos", color: "text-text-muted border-border-input" },
  { key: "ATIVO", label: "Ativos", color: "text-emerald-400 border-emerald-400" },
  { key: "TRIAL", label: "Trial", color: "text-blue-400 border-blue-400" },
  { key: "INADIMPLENTE", label: "Inadimplentes", color: "text-amber-400 border-amber-400" },
  { key: "BLOQUEADO", label: "Bloqueados", color: "text-red-400 border-red-400" },
];

export default function ClientTable({
  empresas,
  loading,
  loadingPagamento,
  onRefresh,
  onOpenEquipe,
  onOpenFatura,
  onAlternarStatus,
  onExcluir,
  onConfirmarPagamento,
  onVincular,
}: Props) {
  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Recebe filtro do InsightsBoard (ou outro componente externo) via evento custom
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const status = detail?.status;
      if (status === 'ATIVO' || status === 'TRIAL' || status === 'INADIMPLENTE' || status === 'BLOQUEADO' || status === 'TODOS') {
        setStatusFilter(status);
      }
    };
    window.addEventListener('saas:filter', handler);
    return () => window.removeEventListener('saas:filter', handler);
  }, []);

  // Contadores por status
  const contadores = useMemo(() => {
    const c = { TODOS: 0, ATIVO: 0, TRIAL: 0, INADIMPLENTE: 0, BLOQUEADO: 0 };
    for (const emp of empresas) {
      c.TODOS++;
      const s = classificarStatus(emp);
      c[s]++;
    }
    return c;
  }, [empresas]);

  // Filtrar + ordenar
  const listaFiltrada = useMemo(() => {
    let lista = [...empresas];

    // Busca por nome ou CNPJ
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(
        (e) =>
          e.nome?.toLowerCase().includes(q) ||
          e.cnpj?.toLowerCase().includes(q)
      );
    }

    // Filtro de status
    if (statusFilter !== "TODOS") {
      lista = lista.filter((e) => classificarStatus(e) === statusFilter);
    }

    // Ordenação
    lista.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "nome":
          va = a.nome?.toLowerCase() || "";
          vb = b.nome?.toLowerCase() || "";
          break;
        case "plano":
          va = a.plano || "PROFESSIONAL";
          vb = b.plano || "PROFESSIONAL";
          break;
        case "status":
          va = classificarStatus(a);
          vb = classificarStatus(b);
          break;
        case "funcs":
          va = a._count?.usuarios || 0;
          vb = b._count?.usuarios || 0;
          break;
        case "admins":
          va = a.usuarios?.length || 0;
          vb = b.usuarios?.length || 0;
          break;
        case "valor": {
          const { calcularFinanceiro } = require("@/lib/saas-financeiro");
          va = calcularFinanceiro(a).valorFinal;
          vb = calcularFinanceiro(b).valorFinal;
          break;
        }
        default:
          va = a.nome || "";
          vb = b.nome || "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return lista;
  }, [empresas, busca, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <th
      onClick={() => toggleSort(sKey)}
      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary transition-colors select-none"
    >
      {label}
      {sortKey === sKey && (
        <span className="ml-1 text-purple-400">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  return (
    <div id="client-table" className="bg-surface border border-border-subtle rounded-2xl backdrop-blur overflow-hidden scroll-mt-24">
      {/* Barra de filtros */}
      <div className="p-4 border-b border-border-subtle">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Busca */}
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              className="w-full bg-elevated pl-10 pr-4 py-2.5 rounded-xl text-sm text-text-primary border border-border-subtle outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-2 rounded-lg hover:bg-hover-bg"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Atualizar
          </button>
        </div>

        {/* Tabs de status */}
        <div className="flex flex-wrap gap-2 mt-3">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                statusFilter === tab.key
                  ? `${tab.color} bg-hover-bg border-current`
                  : "text-text-faint border-border-subtle hover:text-text-secondary hover:border-border-default"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 opacity-60">({contadores[tab.key]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-solid/80">
            <tr>
              <SortHeader label="Empresa" sKey="nome" />
              <SortHeader label="Plano" sKey="plano" />
              <SortHeader label="Status" sKey="status" />
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary" onClick={() => toggleSort("funcs")}>
                Funcs {sortKey === "funcs" && <span className="text-purple-400">{sortDir === "asc" ? "↑" : "↓"}</span>}
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary" onClick={() => toggleSort("admins")}>
                Admins {sortKey === "admins" && <span className="text-purple-400">{sortDir === "asc" ? "↑" : "↓"}</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Vencimento</th>
              <SortHeader label="Valor/mes" sKey="valor" />
              <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-20 text-text-faint">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                  Carregando empresas...
                </td>
              </tr>
            ) : listaFiltrada.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-20 text-text-faint">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            ) : (
              listaFiltrada.map((emp) => (
                <ClientRow
                  key={emp.id}
                  empresa={emp}
                  loadingPagamento={loadingPagamento}
                  onOpenEquipe={onOpenEquipe}
                  onOpenFatura={onOpenFatura}
                  onAlternarStatus={onAlternarStatus}
                  onExcluir={onExcluir}
                  onConfirmarPagamento={onConfirmarPagamento}
                  onVincular={onVincular}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden p-3 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-text-faint">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        ) : listaFiltrada.length === 0 ? (
          <p className="text-center py-10 text-text-faint">Nenhuma empresa encontrada.</p>
        ) : (
          listaFiltrada.map((emp) => {
            const status = classificarStatus(emp);
            const sCfg = {
              ATIVO: { label: "Ativo", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
              TRIAL: { label: "Trial", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
              INADIMPLENTE: { label: "Inadimplente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
              BLOQUEADO: { label: "Bloqueado", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
            }[status];
            const { calcularFinanceiro } = require("@/lib/saas-financeiro");
            const fin = calcularFinanceiro(emp);
            const pagoAte = emp.pagoAte ? new Date(emp.pagoAte) : null;
            const estaPago = !!(pagoAte && pagoAte >= new Date());

            return (
              <div key={emp.id} className="bg-elevated border border-border-subtle rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-bold text-text-primary truncate">{emp.nome}</p>
                    <p className="text-[10px] text-text-faint">{emp.cnpj || "Sem CNPJ"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${sCfg.cls}`}>
                    {sCfg.label}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-text-muted mb-3">
                  <span>{fin.totalVidas} funcs</span>
                  <span>{fin.totalAdmins} admins</span>
                  <span className="text-emerald-400 font-bold">
                    {fin.valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <EmpresaActions
                  empresa={emp}
                  estaPago={estaPago}
                  loadingPagamento={loadingPagamento}
                  onOpenEquipe={onOpenEquipe}
                  onOpenFatura={onOpenFatura}
                  onAlternarStatus={onAlternarStatus}
                  onExcluir={onExcluir}
                  onConfirmarPagamento={onConfirmarPagamento}
                  onVincular={onVincular}
                  layout="card"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
