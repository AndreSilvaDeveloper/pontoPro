"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  Save,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Crown,
  ChevronRight,
  Mail,
  Shield,
  CreditCard,
  Receipt,
  Building2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, differenceInDays, isValid, addDays } from "date-fns";
import type { BillingStatus } from "@/lib/billing";

import PaymentModal, { AsaasBundle } from "@/components/billing/PaymentModal";

// === FUNÇÕES AUXILIARES DE PIX (mantidas) ===
const normalizeText = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const emv = (id: string, value: string) =>
  `${id}${value.length.toString().padStart(2, "0")}${value}`;
const crc16ccitt = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++)
      crc = (crc & 0x8000) > 0 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
};
const formatarChaveParaPayload = (chave: string) => {
  const limpa = chave.trim();
  if (
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      limpa
    )
  )
    return limpa;
  if (limpa.includes("@")) return limpa;
  if (limpa.startsWith("+")) return limpa;
  return limpa.replace(/[^0-9]/g, "");
};
const gerarPayloadPix = (
  chave: string,
  nome: string,
  cidade: string,
  valor?: string,
  txid: string = "***"
) => {
  const chaveFormatada = formatarChaveParaPayload(chave);
  const nomeLimpo = normalizeText(nome).substring(0, 25);
  const cidadeLimpa = normalizeText(cidade).substring(0, 15);

  let payload =
    emv("00", "01") +
    emv("26", emv("00", "BR.GOV.BCB.PIX") + emv("01", chaveFormatada)) +
    emv("52", "0000") +
    emv("53", "986");

  if (valor) payload += emv("54", parseFloat(valor).toFixed(2));

  payload +=
    emv("58", "BR") +
    emv("59", nomeLimpo) +
    emv("60", cidadeLimpa) +
    emv("62", emv("05", txid)) +
    "6304";
  return payload + crc16ccitt(payload);
};

// === HELPERS DE DATA ===
function parseDateOnlyToLocal(dateOrIso: any): Date | null {
  if (!dateOrIso) return null;

  if (dateOrIso instanceof Date) {
    if (!isValid(dateOrIso)) return null;
    return new Date(
      dateOrIso.getFullYear(),
      dateOrIso.getMonth(),
      dateOrIso.getDate(),
      0,
      0,
      0,
      0
    );
  }

  const s = String(dateOrIso);
  const base = s.slice(0, 10);
  if (!base || base.length !== 10) return null;

  const [y, m, d] = base.split("-").map(Number);
  if (!y || !m || !d) return null;

  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return isValid(dt) ? dt : null;
}

function formatSafe(d: Date | null, fmt = "dd/MM/yyyy") {
  if (!d || !isValid(d)) return "\u2014";
  return format(d, fmt);
}

type FaturaState = {
  empresa: any;
  billing: BillingStatus;
  valor: number;
  vencimento: Date | null;
  trialEndsAt: Date | null;
  billingAnchorAt: Date | null;
  chavePix: string;
  pago: boolean;
  itens: {
    vidasExcedentes: number;
    adminsExcedentes: number;
    custoVidas: number;
    custoAdmins: number;
  };
};

export default function PerfilAdmin() {
  const { data: session } = useSession();

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const [fatura, setFatura] = useState<FaturaState | null>(null);
  const [loadingFatura, setLoadingFatura] = useState(true);

  const [asaas, setAsaas] = useState<AsaasBundle | null>(null);
  const [loadingAsaas, setLoadingAsaas] = useState(false);
  const [msgAsaas, setMsgAsaas] = useState<string | null>(null);

  const [openPay, setOpenPay] = useState(false);

  useEffect(() => {
    carregarDadosFinanceiros();
    carregarCobrancaAtual();
  }, []);

  const carregarDadosFinanceiros = async () => {
    try {
      const res = await axios.get("/api/admin/faturas");
      if (!res.data?.ok) return;

      if (res.data?.empresa?.isFilial) {
        setLoadingFatura(false);
        return;
      }

      const empresa = res.data.empresa;
      const billing = res.data.billing as BillingStatus;

      const trialEndsAt = parseDateOnlyToLocal(empresa?.trialAte);

      let billingAnchorAt = parseDateOnlyToLocal(empresa?.billingAnchorAt);
      if (!billingAnchorAt && trialEndsAt) billingAnchorAt = addDays(trialEndsAt, 30);

      const vencISO = res.data?.fatura?.vencimentoISO;
      const vencNormal = parseDateOnlyToLocal(vencISO);
      const vencimento = vencNormal ?? billingAnchorAt;

      setFatura({
        empresa,
        billing,
        valor: Number(res.data.fatura?.valor ?? 0),
        vencimento,
        trialEndsAt,
        billingAnchorAt,
        chavePix:
          empresa?.chavePix && String(empresa.chavePix).length > 3
            ? String(empresa.chavePix)
            : "118.544.546-33",
        pago: Boolean(res.data.fatura?.pago),
        itens: res.data.fatura?.itens ?? {
          vidasExcedentes: 0,
          adminsExcedentes: 0,
          custoVidas: 0,
          custoAdmins: 0,
        },
      });
    } catch (e) {
      console.error("Erro ao carregar financeiro", e);
    } finally {
      setLoadingFatura(false);
    }
  };

  const carregarCobrancaAtual = async () => {
    try {
      const res = await axios.get("/api/admin/asaas/cobranca-atual");
      if (!res.data?.ok) return;

      if (res.data?.hasPayment) setAsaas(res.data.asaas);
      else setAsaas(null);
    } catch (e) {
      console.error("Erro ao buscar cobrança atual", e);
    }
  };

  const gerarCobrancaAsaas = async () => {
    setLoadingAsaas(true);
    setMsgAsaas(null);
    try {
      const res = await axios.post("/api/admin/asaas/gerar-cobranca");
      if (!res.data?.ok) throw new Error("Falha ao gerar cobrança");
      setAsaas(res.data.asaas);
      setMsgAsaas("Cobrança carregada/atualizada!");
    } catch (e) {
      console.error("Erro ao gerar cobrança ASAAS", e);
      setMsgAsaas("Erro ao gerar cobrança. Tente novamente.");
    } finally {
      setLoadingAsaas(false);
    }
  };

  const abrirPagamento = async () => {
    setMsgAsaas(null);
    await carregarCobrancaAtual();
    if (!asaas) {
      await gerarCobrancaAsaas();
    } else {
      await carregarCobrancaAtual();
    }
    setOpenPay(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (senha !== confirmar)
      return setMsg({ tipo: "erro", texto: "As senhas não conferem." });
    if (senha.length < 4)
      return setMsg({ tipo: "erro", texto: "A senha precisa ter no mínimo 4 caracteres." });

    setLoading(true);
    try {
      await axios.post("/api/auth/trocar-senha", { novaSenha: senha });
      setMsg({ tipo: "sucesso", texto: "Senha alterada com sucesso!" });
      setSenha("");
      setConfirmar("");
    } catch (error: any) {
      setMsg({
        tipo: "erro",
        texto: "Erro ao salvar: " + (error.response?.data?.erro || "Tente novamente."),
      });
    } finally {
      setLoading(false);
    }
  };

  const baixarBoleto = () => {
    if (!fatura) return;

    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(
        '<html><head><title>Gerando Fatura...</title></head><body style="background:#0b1220;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:white;"><h3>Gerando Fatura... Aguarde.</h3></body></html>'
      );
    }

    try {
      const doc = new jsPDF();

      const payloadPix = gerarPayloadPix(
        fatura.chavePix,
        "Ontime Sistemas",
        "Juiz de Fora",
        fatura.valor.toFixed(2),
        `FAT${format(new Date(), "MMyy")}`
      );

      doc.setFillColor(88, 28, 135);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("ONTIME SISTEMAS", 14, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Demonstrativo de Serviços e Cobrança", 14, 30);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`VENCIMENTO: ${formatSafe(fatura.vencimento)}`, 195, 20, { align: "right" });

      doc.setFontSize(14);
      doc.text(
        `TOTAL: ${fatura.valor.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}`,
        195,
        30,
        { align: "right" }
      );

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("CLIENTE:", 14, 55);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${String(fatura.empresa?.nome || "EMPRESA").toUpperCase()}`, 14, 62);
      doc.text(`CNPJ: ${fatura.empresa?.cnpj || "Não Informado"}`, 14, 68);

      const dadosTabela: any[] = [["Assinatura Mensal (Pacote Base)", "1", "R$ 99,90", "R$ 99,90"]];

      if (fatura.itens.vidasExcedentes > 0) {
        dadosTabela.push([
          `Funcionários Excedentes (${fatura.itens.vidasExcedentes} x R$ 7,90)`,
          `${fatura.itens.vidasExcedentes}`,
          "R$ 7,90",
          fatura.itens.custoVidas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        ]);
      }

      if (fatura.itens.adminsExcedentes > 0) {
        dadosTabela.push([
          `Administradores Adicionais (${fatura.itens.adminsExcedentes} x R$ 49,90)`,
          `${fatura.itens.adminsExcedentes}`,
          "R$ 49,90",
          fatura.itens.custoAdmins.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        ]);
      }

      autoTable(doc, {
        head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
        body: dadosTabela,
        startY: 85,
        theme: "striped",
        headStyles: { fillColor: [55, 65, 81] },
        columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
      });

      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY + 20;

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, finalY, 182, 75, 3, 3, "FD");

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(88, 28, 135);
      doc.text("PAGAMENTO VIA PIX", 20, finalY + 12);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Chave Pix:", 20, finalY + 25);

      doc.setFontSize(12);
      doc.text(fatura.chavePix, 20, finalY + 32);

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Copia e Cola:", 20, finalY + 45);

      const splitPayload = doc.splitTextToSize(payloadPix, 160);
      doc.text(splitPayload, 20, finalY + 52);

      const blobUrl = doc.output("bloburl");
      if (janela) janela.location.href = String(blobUrl);
      else window.open(String(blobUrl), "_blank");
    } catch {
      if (janela) janela.close();
      alert("Erro ao gerar boleto.");
    }
  };

  // ==========================
  // RENDER: Alerta financeiro
  // ==========================
  const renderBillingBadge = () => {
    if (!fatura) return null;

    if (fatura.billing.phase === "TRIAL") {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 border border-amber-500/20">
          <Clock size={14} />
          Trial: {fatura.billing.days ?? 0} dias restantes
        </div>
      );
    }

    if (fatura.pago) {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
          <CheckCircle size={14} />
          Em dia
        </div>
      );
    }

    const dataVenc = fatura.vencimento;
    if (!dataVenc || !isValid(dataVenc)) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencZerado = new Date(dataVenc);
    vencZerado.setHours(0, 0, 0, 0);
    const diasParaVencimento = differenceInDays(vencZerado, hoje);

    if (diasParaVencimento <= -10) {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/20 animate-pulse">
          <Lock size={14} />
          Bloqueio iminente
        </div>
      );
    }

    if (diasParaVencimento < 0) {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/20">
          <AlertTriangle size={14} />
          Vencida h\u00e1 {Math.abs(diasParaVencimento)}d
        </div>
      );
    }

    if (diasParaVencimento <= 5) {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-1.5 text-xs font-bold text-yellow-400 border border-yellow-500/20">
          <Clock size={14} />
          Vence em {diasParaVencimento}d
        </div>
      );
    }

    return null;
  };

  const renderBillingAlert = () => {
    if (!fatura) return null;

    if (fatura.billing.phase === "TRIAL") {
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Clock size={22} />
            </div>
            <div>
              <p className="font-bold text-amber-300">Per\u00edodo de teste ativo</p>
              <p className="text-sm text-amber-200/60">
                Restam <b>{fatura.billing.days ?? "\u2014"}</b> dias (at\u00e9{" "}
                <b>{formatSafe(fatura.trialEndsAt)}</b>). 1\u00aa fatura em{" "}
                <b>{formatSafe(fatura.billingAnchorAt)}</b>.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (fatura.pago) return null;

    const dataVenc = fatura.vencimento;
    if (!dataVenc || !isValid(dataVenc)) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencZerado = new Date(dataVenc);
    vencZerado.setHours(0, 0, 0, 0);
    const diasParaVencimento = differenceInDays(vencZerado, hoje);

    if (diasParaVencimento <= -10) {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/40 to-slate-900/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-red-600/5 animate-pulse pointer-events-none" />
          <div className="flex items-center gap-4 z-10">
            <div className="shrink-0 rounded-xl bg-red-600 p-3 text-white">
              <Lock size={22} />
            </div>
            <div>
              <p className="font-bold text-red-400 text-lg">Bloqueio de acesso</p>
              <p className="text-sm text-slate-300">
                Fatura vencida h\u00e1 {Math.abs(diasParaVencimento)} dias. Regularize para continuar.
              </p>
            </div>
          </div>
          <button
            onClick={abrirPagamento}
            className="z-10 shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors"
          >
            REGULARIZAR
          </button>
        </div>
      );
    }

    if (diasParaVencimento < 0) {
      return (
        <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-red-500/10 p-3 text-red-400">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="font-bold text-red-400">Fatura vencida</p>
              <p className="text-sm text-red-200/60">
                Venceu em {format(vencZerado, "dd/MM")}. Evite bloqueio regularizando agora.
              </p>
            </div>
          </div>
          <button
            onClick={abrirPagamento}
            className="shrink-0 rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-2.5 text-sm font-bold text-red-300 hover:bg-red-500/20 transition-colors"
          >
            PAGAR AGORA
          </button>
        </div>
      );
    }

    if (diasParaVencimento <= 5) {
      return (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-yellow-500/10 p-3 text-yellow-400">
              <Clock size={22} />
            </div>
            <div>
              <p className="font-bold text-yellow-400">Fatura em aberto</p>
              <p className="text-sm text-yellow-200/60">
                {diasParaVencimento === 0
                  ? "Vence HOJE!"
                  : `Vence em ${diasParaVencimento} dias (${format(vencZerado, "dd/MM")}).`}
              </p>
            </div>
          </div>
          <button
            onClick={abrirPagamento}
            className="shrink-0 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-400 transition-colors"
          >
            PAGAR AGORA
          </button>
        </div>
      );
    }

    return null;
  };

  const cargo = (session?.user as any)?.cargo ?? "";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* MODAL */}
      <PaymentModal
        open={openPay}
        onClose={() => setOpenPay(false)}
        asaas={asaas}
        loading={loadingAsaas}
        onRefresh={carregarCobrancaAtual}
        onGenerate={gerarCobrancaAsaas}
        msg={msgAsaas}
        setMsg={setMsgAsaas}
      />

      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="shrink-0 rounded-xl bg-slate-800/80 p-2.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Minha Conta</h1>
            <p className="text-xs text-slate-500">Perfil, assinatura e seguran\u00e7a</p>
          </div>
          {!loadingFatura && renderBillingBadge()}
        </div>

        {/* User Card */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/50 p-6">
          <div className="flex items-center gap-4">
            <div className="shrink-0 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-800/20 ring-1 ring-purple-500/20">
              <User size={28} className="text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{session?.user?.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                <Mail size={14} className="shrink-0" />
                <span className="truncate">{session?.user?.email}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold uppercase text-purple-300 border border-purple-500/20">
                  <Shield size={12} />
                  {cargo}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Alert */}
        {!loadingFatura && renderBillingAlert()}

        {/* Quick Links */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/perfil/plano"
            className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all hover:border-purple-500/30 hover:bg-slate-900"
          >
            <div className="shrink-0 rounded-xl bg-purple-500/10 p-3 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <Crown size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Meu Plano</p>
              <p className="text-xs text-slate-500">Gerencie sua assinatura</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </Link>

          <Link
            href="/admin/perfil/historico"
            className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="shrink-0 rounded-xl bg-slate-800 p-3 text-slate-400 group-hover:bg-slate-700 transition-colors">
              <Receipt size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Hist\u00f3rico de Faturas</p>
              <p className="text-xs text-slate-500">Veja pagamentos anteriores</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </Link>

          {!fatura?.pago && fatura && fatura.billing.phase !== "TRIAL" && (
            <button
              onClick={abrirPagamento}
              className="group flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 transition-all hover:border-emerald-500/30 hover:bg-emerald-950/30 sm:col-span-2"
            >
              <div className="shrink-0 rounded-xl bg-emerald-500/10 p-3 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <CreditCard size={20} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-sm text-emerald-300">Realizar Pagamento</p>
                <p className="text-xs text-emerald-400/60">
                  {fatura.vencimento && isValid(fatura.vencimento)
                    ? `Vencimento: ${formatSafe(fatura.vencimento)} \u2022 R$ ${fatura.valor.toFixed(2).replace(".", ",")}`
                    : "Gerar cobran\u00e7a via PIX ou Boleto"}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-emerald-600 group-hover:text-emerald-400 transition-colors" />
            </button>
          )}
        </div>

        {/* Alterar Senha */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            <Lock size={16} className="text-yellow-500" />
            Seguran\u00e7a
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  placeholder="Digite a nova senha"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  placeholder="Digite novamente"
                  required
                />
              </div>
            </div>

            {msg && (
              <div
                className={`rounded-xl p-3 text-center text-sm font-bold ${
                  msg.tipo === "erro"
                    ? "bg-red-500/10 text-red-300 border border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                }`}
              >
                {msg.texto}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? (
                "Salvando..."
              ) : (
                <>
                  <Save size={16} /> ATUALIZAR SENHA
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
