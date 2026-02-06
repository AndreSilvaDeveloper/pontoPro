"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, RefreshCcw, Receipt } from "lucide-react";
import { format } from "date-fns";

type CobrancaStatus = "PENDING" | "OVERDUE" | "RECEIVED" | string;

type HistoricoItem = {
  id: string;
  competencia: string;
  meses: number;
  value: number;
  dueDateISO: string | null;
  status: CobrancaStatus;
  paymentId: string;
  bankSlipUrl?: string | null;
  invoiceUrl?: string | null;
  createdAtISO?: string | null;
  updatedAtISO?: string | null;
};

function statusLabel(st?: string | null) {
  const s = String(st || "").toUpperCase();
  if (s === "RECEIVED") return "Paga";
  if (s === "OVERDUE") return "Vencida";
  if (s === "PENDING") return "Em aberto";
  return s || "—";
}

function statusBadgeClass(st?: string | null) {
  const s = String(st || "").toUpperCase();
  if (s === "RECEIVED") return "bg-emerald-900/30 text-emerald-300 border border-emerald-500/30";
  if (s === "OVERDUE") return "bg-red-900/30 text-red-300 border border-red-500/30";
  if (s === "PENDING") return "bg-yellow-900/30 text-yellow-300 border border-yellow-500/30";
  return "bg-slate-800 text-slate-300 border border-slate-700";
}

function pickBoletoUrl(c?: { bankSlipUrl?: any; invoiceUrl?: any } | null) {
  const url = c?.bankSlipUrl || c?.invoiceUrl;
  return url ? String(url) : "";
}

export default function FaturasPage() {
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<any>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [historicoPagas, setHistoricoPagas] = useState<HistoricoItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setErro(null);
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/fatura");
      if (!res.data?.ok) throw new Error("Falha ao carregar dados.");

      setEmpresa(res.data.empresa || null);
      setHistorico(Array.isArray(res.data?.historico) ? res.data.historico : []);
      setHistoricoPagas(Array.isArray(res.data?.historicoPagas) ? res.data.historicoPagas : []);
    } catch (e: any) {
      setErro(e?.response?.data?.erro || e?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const totalEmAberto = useMemo(
    () => historico.filter((h) => String(h.status).toUpperCase() !== "RECEIVED").length,
    [historico]
  );

  const renderLista = (items: HistoricoItem[], emptyText: string) => {
    if (items.length === 0) {
      return <p className="text-slate-400 text-sm">{emptyText}</p>;
    }

    return (
      <div className="space-y-3">
        {items.map((h) => {
          const url = pickBoletoUrl(h);
          const due = h.dueDateISO ? new Date(h.dueDateISO) : null;

          return (
            <div
              key={h.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-100">{h.competencia}</span>
                  <span className={`text-xs px-2 py-1 rounded ${statusBadgeClass(h.status)}`}>
                    {statusLabel(h.status)}
                  </span>
                </div>

                <div className="text-sm text-slate-400 mt-1">
                  <span className="mr-3">
                    Vencimento: <b className="text-slate-200">{due ? format(due, "dd/MM/yyyy") : "—"}</b>
                  </span>
                  <span>
                    Valor:{" "}
                    <b className="text-slate-200">
                      {Number(h.value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </b>
                  </span>
                </div>

                {/* ID interno (suporte): escondido por padrão */}
              <details className="mt-2">
                <summary className="text-xs text-slate-500 cursor-pointer select-none">
                  Ver detalhes (suporte)
                </summary>
                <div className="text-xs text-slate-500 mt-1 break-all">
                  PaymentId: <span className="text-slate-400">{h.paymentId}</span>
                </div>
              </details>

              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {url ? (
                  <button
                    onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"
                  >
                    <ExternalLink size={14} /> ABRIR
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 border border-slate-800 rounded-lg px-3 py-2">
                    Sem link salvo
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
              <Receipt size={22} /> Faturas
            </h1>
            <p className="text-slate-400 text-sm">
              {empresa?.nome ? `Empresa: ${empresa.nome}` : "Histórico e status das cobranças"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={carregar}
              className="text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCcw size={14} /> Atualizar
            </button>

            <Link
              href="/admin/perfil"
              className="text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-300 flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Voltar
            </Link>
          </div>
        </div>

        {erro ? (
          <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 text-red-200 text-sm">
            {erro}
          </div>
        ) : null}

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-purple-400" /> Histórico de faturas
            </h2>
            <span className="text-xs text-slate-400">
              {loading ? "Carregando..." : `${historico.length} registro(s) • ${totalEmAberto} em aberto/vencidas`}
            </span>
          </div>

          {loading ? <p className="text-slate-400 text-sm">Carregando...</p> : renderLista(historico, "Nenhuma cobrança encontrada.")}
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-emerald-400" /> Faturas pagas
            </h2>
            <span className="text-xs text-slate-400">{loading ? "Carregando..." : `${historicoPagas.length} paga(s)`}</span>
          </div>

          {loading ? (
            <p className="text-slate-400 text-sm">Carregando...</p>
          ) : (
            renderLista(historicoPagas, "Ainda não há faturas pagas registradas.")
          )}
        </div>
      </div>
    </div>
  );
}
