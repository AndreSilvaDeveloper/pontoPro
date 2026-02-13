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
      className: "bg-slate-900 border-slate-700 text-slate-300",
    },
    CANCELED: {
      label: "Cancelado",
      className: "bg-slate-900 border-slate-700 text-slate-300",
    },
  };

  return map[s] ?? {
    label: s || "—",
    className: "bg-slate-900 border-slate-700 text-slate-200",
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
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-purple-400">Histórico de faturas</h1>
            <p className="text-slate-400 text-sm">
              Últimas cobranças 
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg font-bold text-xs"
            >
              <RefreshCw size={16} />
              ATUALIZAR
            </button>

            <Link
              href="/admin/perfil"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
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

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="text-slate-300 text-sm">
              Total listado: <b className="text-white">{formatBRL(total)}</b>
            </div>
            <div className="text-slate-400 text-xs">
              Obs: valores podem incluir cobranças reusadas/reemissões.
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <FileText size={18} />
              Cobranças
            </h2>
            {loading && <span className="text-slate-400 text-xs">Carregando…</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/60 text-slate-300">
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
                    <td className="px-4 py-6 text-slate-400" colSpan={5}>
                      Nenhuma cobrança encontrada.
                    </td>
                  </tr>
                )}

                {items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-800">
                    <td className="px-4 py-3 text-slate-300">{formatDateBR(it.dateCreated)}</td>
                    <td className="px-4 py-3 text-slate-200">{formatDateBR(it.dueDate)}</td>
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
                    <td className="px-4 py-3 text-right font-bold text-white">{formatBRL(it.value)}</td>
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
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold"
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

          <div className="p-3 border-t border-slate-800 text-xs text-slate-500">
            Fonte: Asaas /payments (limit 30)
          </div>
        </div>
      </div>
    </div>
  );
}
