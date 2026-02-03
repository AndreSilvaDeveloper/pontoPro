"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type EmpresaMini = {
  id: string;
  nome: string;
  status: string;
  cobrancaAtiva: boolean;
  trialAte: string | null;
  pagoAte: string | null;
  dataUltimoPagamento?: string | null;
};

export default function BillingActions({ empresaId }: { empresaId: string }) {
  const [empresa, setEmpresa] = useState<EmpresaMini | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/saas/empresa/${empresaId}`, { cache: "no-store" });
      const j = await r.json();
      // ajuste conforme seu endpoint retorna:
      setEmpresa(j?.empresa || j);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const confirmar = async (meses: number) => {
    setBusy(`pay-${meses}`);
    try {
      const r = await fetch("/api/saas/confirmar-pagamento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, meses, limparTrial: true }),
      });
      if (!r.ok) throw new Error("Falha ao confirmar pagamento");
      await load();
    } finally {
      setBusy(null);
    }
  };

  const toggleBloq = async (bloquear: boolean) => {
    setBusy(bloquear ? "bloq" : "unbloq");
    try {
      const r = await fetch("/api/saas/toggle-bloqueio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, bloquear }),
      });
      if (!r.ok) throw new Error("Falha ao alterar status");
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="text-sm text-slate-400">Carregando financeiro…</div>;
  if (!empresa) return <div className="text-sm text-red-400">Empresa não carregada.</div>;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-white font-bold">{empresa.nome}</div>
          <div className="text-xs text-slate-400">
            Status: <span className="text-slate-200 font-semibold">{empresa.status}</span> • Cobrança:{" "}
            <span className="text-slate-200 font-semibold">{empresa.cobrancaAtiva ? "ATIVA" : "DESATIVADA"}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Trial até: <span className="text-slate-200">{empresa.trialAte ? new Date(empresa.trialAte).toLocaleString("pt-BR") : "—"}</span>{" "}
            • Pago até: <span className="text-slate-200">{empresa.pagoAte ? new Date(empresa.pagoAte).toLocaleString("pt-BR") : "—"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => confirmar(1)}
          disabled={!!busy}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {busy === "pay-1" ? "Confirmando…" : "Confirmar pagamento (1 mês)"}
        </Button>

        <Button
          onClick={() => confirmar(3)}
          disabled={!!busy}
          variant="outline"
          className="border-emerald-500/30 text-emerald-200 hover:bg-emerald-950/30"
        >
          {busy === "pay-3" ? "Confirmando…" : "Confirmar pagamento (3 meses)"}
        </Button>

        {empresa.status !== "BLOQUEADO" ? (
          <Button
            onClick={() => toggleBloq(true)}
            disabled={!!busy}
            variant="outline"
            className="border-red-500/30 text-red-200 hover:bg-red-950/30"
          >
            {busy === "bloq" ? "Bloqueando…" : "Bloquear manualmente"}
          </Button>
        ) : (
          <Button
            onClick={() => toggleBloq(false)}
            disabled={!!busy}
            variant="outline"
            className="border-slate-500/30 text-slate-200 hover:bg-slate-800"
          >
            {busy === "unbloq" ? "Desbloqueando…" : "Desbloquear manualmente"}
          </Button>
        )}
      </div>

      <div className="text-xs text-slate-500">
        * “Confirmar pagamento” libera e seta <b>pagoAte</b> + <b>dataUltimoPagamento</b> + status <b>ATIVO</b>.
      </div>
    </div>
  );
}
