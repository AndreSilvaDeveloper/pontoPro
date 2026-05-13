"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Receipt,
  Calendar,
  CheckCircle,
  Loader2,
  ExternalLink,
  Banknote,
} from "lucide-react";

type BillingCycle = "MONTHLY" | "YEARLY";
type BillingMethod = "UNDEFINED" | "CREDIT_CARD";

type PagamentoData = {
  ok: boolean;
  billingCycle: BillingCycle;
  billingMethod: BillingMethod;
  nextDueDate: string | null;
  pagoAte: string | null;
  plano: {
    id: string;
    nome: string;
    preco: number;
  };
  calculo: {
    totalMensal: number;
    desconto: number;
    cycle: BillingCycle;
    total: number;
  };
  isFilial: boolean;
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString("pt-BR");
}

export default function PagamentoPage() {
  const router = useRouter();
  const [data, setData] = useState<PagamentoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activatingCard, setActivatingCard] = useState(false);

  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("MONTHLY");

  const load = async () => {
    try {
      const res = await axios.get("/api/admin/pagamento");
      if (res.data?.ok) {
        setData(res.data);
        setSelectedCycle(res.data.billingCycle);
      }
    } catch {
      toast.error("Erro ao carregar dados de pagamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const salvarCiclo = async () => {
    if (!data || selectedCycle === data.billingCycle) return;
    setSaving(true);
    try {
      await axios.put("/api/admin/pagamento", { billingCycle: selectedCycle });
      toast.success(
        selectedCycle === "YEARLY"
          ? "Ciclo alterado para anual!"
          : "Ciclo alterado para mensal!"
      );
      await load();
    } catch {
      toast.error("Erro ao salvar ciclo");
    } finally {
      setSaving(false);
    }
  };

  const ativarCartao = async () => {
    setActivatingCard(true);
    try {
      // 1) Muda método para CREDIT_CARD
      await axios.put("/api/admin/pagamento", { billingMethod: "CREDIT_CARD" });

      // 2) Gera cobrança (cria assinatura com CREDIT_CARD)
      const res = await axios.post("/api/admin/asaas/gerar-cobranca");
      if (!res.data?.ok) throw new Error("Falha ao gerar cobrança");

      // 3) Redireciona para invoiceUrl do Asaas (checkout hospedado)
      const invoiceUrl =
        res.data?.asaas?.pix?.invoiceUrl || res.data?.asaas?.boleto?.invoiceUrl;

      if (invoiceUrl) {
        window.location.href = invoiceUrl;
      } else {
        toast.success("Cartão ativado! A cobrança será gerada automaticamente.");
        await load();
      }
    } catch {
      toast.error("Erro ao ativar cartão de crédito");
    } finally {
      setActivatingCard(false);
    }
  };

  const voltarPixBoleto = async () => {
    setSaving(true);
    try {
      await axios.put("/api/admin/pagamento", { billingMethod: "UNDEFINED" });
      toast.success("Voltou para PIX/Boleto!");
      await load();
    } catch {
      toast.error("Erro ao alterar método");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-text-primary">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-text-primary">
        Erro ao carregar dados.
      </div>
    );
  }

  const isYearly = selectedCycle === "YEARLY";
  const totalMensal = data.calculo.totalMensal;
  const totalAnual = Number((totalMensal * 12 * 0.9).toFixed(2));
  const mensalEquivalente = Number((totalAnual / 12).toFixed(2));
  const economia = Number((totalMensal * 12 - totalAnual).toFixed(2));
  const cycleChanged = selectedCycle !== data.billingCycle;

  // Valor previsto baseado no ciclo selecionado (preview reativo)
  const valorPrevisto = isYearly ? totalAnual : totalMensal;

  return (
    <div className="min-h-screen bg-page text-text-primary p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Pagamento</h1>
            <p className="text-sm text-text-muted">
              Gerencie seu ciclo de cobrança e método de pagamento
            </p>
          </div>
        </div>

        {data.isFilial && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-300">
            O pagamento é gerenciado pela empresa matriz.
          </div>
        )}

        {/* Seção 1 — Ciclo de Cobrança */}
        <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6 space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            <Calendar size={16} className="text-purple-400" />
            Ciclo de Cobrança
          </h3>

          <div className="grid grid-cols-2 gap-3" >
            {/* Mensal */}
            <button
              onClick={() => setSelectedCycle("MONTHLY")}
              disabled={data.isFilial}
              className={`rounded-xl border p-4 text-left transition-all ${
                !isYearly
                  ? "border-purple-500/50 bg-purple-950/30 ring-1 ring-purple-500/30"
                  : "border-border-subtle bg-surface hover:border-border-default"
              }`}
            >
              <p className="font-bold text-sm">Mensal</p>
              <p className="mt-1 text-lg font-extrabold">
                {fmt(totalMensal)}
                <span className="text-xs font-normal text-text-muted">/mês</span>
              </p>
            </button>

            {/* Anual */}
            <button
              onClick={() => setSelectedCycle("YEARLY")}
              disabled={data.isFilial}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                isYearly
                  ? "border-emerald-500/50 bg-emerald-950/30 ring-1 ring-emerald-500/30"
                  : "border-border-subtle bg-surface hover:border-border-default"
              }`}
            >
              <div className="absolute -top-2.5 right-3">
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  -10%
                </span>
              </div>
              <p className="font-bold text-sm">Anual</p>
              <p className="mt-1 text-lg font-extrabold">
                {fmt(totalAnual)}
                <span className="text-xs font-normal text-text-muted">/ano</span>
              </p>
              <p className="text-xs text-emerald-400 mt-1">
                {fmt(mensalEquivalente)}/mês — economize {fmt(economia)}
              </p>
            </button>
          </div>

          {cycleChanged && (
            <button
              onClick={salvarCiclo}
              disabled={saving || data.isFilial}
              className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
            >
              {saving ? "Salvando..." : `Alterar para ${isYearly ? "Anual" : "Mensal"}`}
            </button>
          )}
        </div>

        {/* Seção 2 — Método de Pagamento */}
        <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6 space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            <CreditCard size={16} className="text-purple-400" />
            Método de Pagamento
          </h3>

          {data.billingMethod === "CREDIT_CARD" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-emerald-300">
                    Pagamento automático ativo
                  </p>
                  <p className="text-xs text-emerald-400/60">
                    Cobrança via cartão de crédito recorrente
                  </p>
                </div>
              </div>
              <button
                onClick={voltarPixBoleto}
                disabled={saving || data.isFilial}
                className="w-full rounded-xl border border-border-input bg-elevated-solid py-2.5 text-sm font-bold text-text-secondary transition-colors hover:bg-elevated-solid disabled:opacity-50"
              >
                {saving ? "Alterando..." : "Voltar para PIX/Boleto"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border-input bg-surface-solid/80 p-4">
                <Banknote size={20} className="text-text-muted shrink-0" />
                <div>
                  <p className="font-bold text-sm text-text-secondary">PIX / Boleto</p>
                  <p className="text-xs text-text-faint">
                    Pagamento manual a cada vencimento
                  </p>
                </div>
              </div>
              <button
                onClick={ativarCartao}
                disabled={activatingCard || data.isFilial}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {activatingCard ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Ativando...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Ativar cartão de crédito
                    <ExternalLink size={14} />
                  </>
                )}
              </button>
              <p className="text-xs text-text-faint text-center">
                Você será redirecionado para cadastrar seu cartão de forma segura
              </p>
            </div>
          )}
        </div>

        {/* Seção 3 — Próxima Cobrança */}
        <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            <Receipt size={16} className="text-purple-400" />
            Próxima Cobrança
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-faint">Próximo vencimento</p>
              <p className="text-lg font-bold">{fmtDate(data.nextDueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-text-faint">
                Valor {isYearly ? "(anual)" : "(mensal)"}
              </p>
              <p className="text-lg font-bold">{fmt(valorPrevisto)}</p>
              {isYearly && (
                <p className="text-[11px] text-emerald-400">
                  {fmt(mensalEquivalente)}/mês com 10% off
                </p>
              )}
              {cycleChanged && (
                <p className="text-[10px] text-amber-400 mt-0.5">
                  Salve o ciclo para aplicar
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-text-faint">Plano</p>
              <p className="text-sm font-bold">
                {data.plano.nome} &middot; {isYearly ? "Anual" : "Mensal"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-faint">Pago até</p>
              <p className="text-sm font-bold">{fmtDate(data.pagoAte)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
