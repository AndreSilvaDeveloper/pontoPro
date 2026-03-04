// src/app/admin/perfil/historico/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, RefreshCw } from "lucide-react";

type HistoricoItem = {
  id: string;
  dateCreated: string | null;
  dueDate: string | null;
  status: string | null;
  value: number | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  description: string | null;
};

function formatBRL(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(s: string | null) {
  if (!s) return "—";
  // s pode vir YYYY-MM-DD ou ISO
  const base = s.slice(0, 10);
  const [y, m, d] = base.split("-").map(Number);
  if (!y || !m || !d) return base;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function badge(status?: string | null) {
  const s = (status ?? "").toUpperCase();

  const map: Record<string, { label: string; className: string }> = {
    RECEIVED: {
      label: "Pago",
      className: "bg-emerald-900/30 border-emerald-500/30 text-emerald-300",
    },
    CONFIRMED: {
      label: "Confirmado",
      className: "bg-emerald-900/30 border-emerald-500/30 text-emerald-300",
    },
    RECEIVED_IN_CASH: {
      label: "Pago (Manual)",
      className: "bg-emerald-900/30 border-emerald-500/30 text-emerald-300",
    },
    PENDING: {
      label: "Pendente",
      className: "bg-yellow-900/20 border-yellow-500/30 text-yellow-300",
    },
    OVERDUE: {
      label: "Vencido",
      className: "bg-red-900/20 border-red-500/30 text-red-300",
    },
    REFUNDED: {
      label: "Estornado",
      className: "bg-surface-solid border-border-input text-text-secondary",
    },
    CANCELED: {
      label: "Cancelado",
      className: "bg-surface-solid border-border-input text-text-secondary",
    },
  };

  return map[s] ?? {
    label: s || "—",
    className: "bg-surface-solid border-border-input text-text-secondary",
  };
}


export default function HistoricoFaturasPage() {
  const [items, setItems] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const total = useMemo(
    () => items.reduce((acc, it) => acc + (it.value ?? 0), 0),
    [items]
  );

  const load = async () => {
  setLoading(true);
  setErr(null);
  try {
    const res = await fetch("/api/admin/faturas/historico", { cache: "no-store" });
    const text = await res.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`API não retornou JSON (status ${res.status}).`);
    }

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `Falha (status ${res.status})`);
    }

    setItems(data.items ?? []);
  } catch (e: any) {
    setErr(e?.message || "Erro ao carregar");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-page text-text-primary p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-border-input pb-4">
          <div>
            <h1 className="text-2xl font-bold text-purple-400">Histórico de faturas</h1>
            <p className="text-text-muted text-sm">
              Últimas cobranças 
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 bg-elevated-solid hover:bg-elevated-solid text-text-secondary border border-border-input px-4 py-2 rounded-lg font-bold text-xs"
            >
              <RefreshCw size={16} />
              ATUALIZAR
            </button>

            <Link
              href="/admin/perfil"
              className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary"
            >
              <ArrowLeft size={18} />
              Voltar
            </Link>
          </div>
        </div>

        {err && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 text-red-200">
            {err}
          </div>
        )}

        <div className="bg-surface-solid border border-border-input rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="text-text-secondary text-sm">
              Total listado: <b className="text-text-primary">{formatBRL(total)}</b>
            </div>
            <div className="text-text-muted text-xs">
              Obs: valores podem incluir cobranças reusadas/reemissões.
            </div>
          </div>
        </div>

        <div className="bg-surface-solid border border-border-input rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border-input flex items-center justify-between">
            <h2 className="font-bold text-text-primary flex items-center gap-2">
              <FileText size={18} />
              Cobranças
            </h2>
            {loading && <span className="text-text-muted text-xs">Carregando…</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-input-solid/60 text-text-secondary">
                <tr>
                  <th className="text-left px-4 py-3">Criada</th>
                  <th className="text-left px-4 py-3">Vencimento</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Valor</th>
                  <th className="text-left px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {!loading && items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-text-muted" colSpan={5}>
                      Nenhuma cobrança encontrada.
                    </td>
                  </tr>
                )}

                {items.map((it) => (
                  <tr key={it.id} className="border-t border-border-input">
                    <td className="px-4 py-3 text-text-secondary">{formatDateBR(it.dateCreated)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDateBR(it.dueDate)}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const b = badge(it.status);
                        return (
                          <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs ${b.className}`}>
                            {b.label}
                          </span>
                        );
                      })()}

                    </td>
                    <td className="px-4 py-3 text-right font-bold text-text-primary">{formatBRL(it.value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {it.invoiceUrl && (
                          <a
                            href={it.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            BOLETO Pix <ExternalLink size={14} />
                          </a>
                        )}
                        {it.bankSlipUrl && (
                          <a
                            href={it.bankSlipUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-elevated-solid hover:bg-elevated-solid text-text-secondary border border-border-input px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            Boleto <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-border-input text-xs text-text-faint">
            Fonte: Asaas /payments (limit 30)
          </div>
        </div>
      </div>
    </div>
  );
}
