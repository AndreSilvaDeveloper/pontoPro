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
  Crown,
  ChevronRight,
  Mail,
  Shield,
  CreditCard,
  Receipt,
  QrCode,
  Camera,
  Edit3,
  Phone,
  Building2,
  X,
} from "lucide-react";
import { toast } from 'sonner';
import Image from 'next/image';
import { useSession } from "next-auth/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, isValid, addDays } from "date-fns";
import type { BillingStatus } from "@/lib/billing";
import { validarCNPJ } from "@/utils/cnpj";

import PaymentModal, { AsaasBundle, type PayMode } from "@/components/billing/PaymentModal";

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
  billingCycle: "MONTHLY" | "YEARLY";
  billingMethod: "UNDEFINED" | "CREDIT_CARD";
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
  const [payMode, setPayMode] = useState<PayMode>("PIX");

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
        billingCycle: res.data.fatura?.billingCycle ?? "MONTHLY",
        billingMethod: empresa?.billingMethod ?? "UNDEFINED",
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

  const abrirPagamento = async (mode: PayMode = "PIX") => {
    setPayMode(mode);
    setMsgAsaas(null);
    setLoadingAsaas(true);
    setOpenPay(true);
    try {
      // Tenta buscar cobrança existente
      await carregarCobrancaAtual();
      // Se não encontrou, gera uma nova
      if (!asaas) {
        await gerarCobrancaAsaas();
      }
    } catch {
      // Se falhou ao buscar, tenta gerar
      await gerarCobrancaAsaas();
    } finally {
      setLoadingAsaas(false);
    }
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
    const b = fatura.billing;

    if (b.code === "OK" && b.paidForCycle) {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
          <CheckCircle size={14} />
          Em dia
        </div>
      );
    }

    if (b.code === "BLOCKED" || b.code === "MANUAL_BLOCK") {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/20 animate-pulse">
          <Lock size={14} />
          {b.code === "BLOCKED" ? "Acesso suspenso" : "Bloqueado"}
        </div>
      );
    }

    if (b.code === "PAST_DUE") {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/20">
          <AlertTriangle size={14} />
          Vencida há {b.days ?? 0} {(b.days ?? 0) === 1 ? "dia" : "dias"}
        </div>
      );
    }

    if (b.code === "DUE_SOON") {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 border border-amber-500/20">
          <Clock size={14} />
          {b.days === 0 ? "Vence hoje" : `Vence em ${b.days}d`}
        </div>
      );
    }

    if (b.code === "TRIAL_ACTIVE" || b.code === "TRIAL_ENDING") {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 border border-amber-500/20">
          <Clock size={14} />
          Trial: {b.days ?? 0} {(b.days ?? 0) === 1 ? "dia" : "dias"}
        </div>
      );
    }

    if (b.code === "PENDING_FIRST_INVOICE" && b.showAlert) {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 border border-amber-500/20">
          <Clock size={14} />
          Fatura em {b.days ?? 0}d
        </div>
      );
    }

    // OK sem paidForCycle (aguardando pagamento, mas longe do vencimento)
    if (b.code === "OK" && !b.showAlert) return null;

    return null;
  };

  const renderBillingAlert = () => {
    if (!fatura) return null;
    const b = fatura.billing;

    // OK e pago → mostra "em dia"
    if (b.code === "OK" && b.paidForCycle) {
      return (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="font-bold text-emerald-300">Assinatura em dia</p>
              <p className="text-sm text-emerald-400/60">
                Próximo vencimento em <b>{formatSafe(fatura.vencimento)}</b>.
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (b.code === "OK" && !b.showAlert) return null;

    // TRIAL
    if (b.code === "TRIAL_ACTIVE" || b.code === "TRIAL_ENDING") {
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Clock size={22} />
            </div>
            <div>
              <p className="font-bold text-amber-300">Período de teste ativo</p>
              <p className="text-sm text-amber-200/60">
                Restam <b>{b.days ?? "—"}</b> {(b.days ?? 0) === 1 ? "dia" : "dias"} (até{" "}
                <b>{formatSafe(fatura.trialEndsAt)}</b>).
                {fatura.billingAnchorAt && (
                  <> 1ª fatura em <b>{formatSafe(fatura.billingAnchorAt)}</b>.</>
                )}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // PENDING_FIRST_INVOICE — só mostra se showAlert (≤3 dias)
    if (b.code === "PENDING_FIRST_INVOICE" && b.showAlert) {
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Clock size={22} />
            </div>
            <div>
              <p className="font-bold text-amber-400">Fatura a caminho</p>
              <p className="text-sm text-amber-200/60">{b.message}</p>
            </div>
          </div>
        </div>
      );
    }

    // BLOCKED / MANUAL_BLOCK
    if (b.code === "BLOCKED" || b.code === "MANUAL_BLOCK") {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/40 to-slate-900/50 p-5 space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-red-600/5 animate-pulse pointer-events-none" />
          <div className="flex items-center gap-4 z-10 relative">
            <div className="shrink-0 rounded-xl bg-red-600 p-3 text-white">
              <Lock size={22} />
            </div>
            <div>
              <p className="font-bold text-red-400 text-lg">
                {b.code === "MANUAL_BLOCK" ? "Acesso bloqueado" : "Acesso suspenso"}
              </p>
              <p className="text-sm text-text-secondary">{b.message}</p>
            </div>
          </div>
          {/* Botões de pagamento ficam na seção "Realizar Pagamento" abaixo */}
        </div>
      );
    }

    // PAST_DUE
    if (b.code === "PAST_DUE") {
      return (
        <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-red-500/10 p-3 text-red-400">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="font-bold text-red-400">Fatura vencida</p>
              <p className="text-sm text-red-200/60">{b.message}</p>
            </div>
          </div>
        </div>
      );
    }

    // DUE_SOON
    if (b.code === "DUE_SOON") {
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Clock size={22} />
            </div>
            <div>
              <p className="font-bold text-amber-400">Fatura em aberto</p>
              <p className="text-sm text-amber-200/60">{b.message}</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const cargo = (session?.user as any)?.cargo ?? "";

  // === PERFIL EDITÁVEL ===
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilNome, setPerfilNome] = useState('');
  const [perfilEmail, setPerfilEmail] = useState('');
  const [perfilTelefone, setPerfilTelefone] = useState('');
  const [perfilCnpj, setPerfilCnpj] = useState('');
  const [perfilEmpresa, setPerfilEmpresa] = useState('');
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setPerfilNome((session.user as any).nome || session.user.name || '');
      setPerfilEmail(session.user.email || '');
      setPerfilFoto((session.user as any).fotoPerfilUrl || null);
    }
  }, [session]);

  useEffect(() => {
    axios.get('/api/admin/empresa').then(res => {
      if (res.data) {
        setPerfilEmpresa(res.data.nome || '');
        setPerfilCnpj(res.data.cnpj || '');
        setPerfilTelefone(res.data.cobrancaWhatsapp || '');
      }
    }).catch(() => {});
  }, []);

  const formatarTelPerfil = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const formatarCnpjPerfil = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  };

  const salvarPerfil = async () => {
    const cnpjDigits = perfilCnpj.replace(/\D/g, '');
    if (cnpjDigits && !validarCNPJ(cnpjDigits)) {
      toast.error('CNPJ inválido. Verifique os dígitos.');
      return;
    }
    setSalvandoPerfil(true);
    try {
      // Atualizar dados do admin via formData
      const fd = new FormData();
      fd.append('id', (session?.user as any)?.id || '');
      fd.append('nome', perfilNome);
      fd.append('email', perfilEmail);
      await axios.put('/api/admin/funcionarios', fd);

      // Atualizar dados da empresa
      await axios.put('/api/admin/empresa', {
        nome: perfilEmpresa,
        cnpj: perfilCnpj.replace(/\D/g, ''),
        cobrancaWhatsapp: perfilTelefone.replace(/\D/g, ''),
      });
      toast.success('Perfil atualizado!');
      setEditandoPerfil(false);
    } catch (err: any) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append('foto', file);
      formData.append('id', (session?.user as any)?.id || '');
      const res = await axios.post('/api/admin/funcionarios/foto', formData);
      setPerfilFoto(res.data.fotoPerfilUrl);
      toast.success('Foto atualizada!');
    } catch {
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingFoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-text-primary">
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
        mode={payMode}
      />

      <div className="mx-auto max-w-3xl p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="shrink-0 rounded-xl bg-elevated/80 p-2.5 text-text-muted hover:bg-elevated-solid hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Minha Conta</h1>
            <p className="text-xs text-text-faint">Perfil, assinatura e segurança</p>
          </div>
          {!loadingFatura && renderBillingBadge()}
        </div>

        {/* User Card */}
        <div className="rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-6">
          <div className="flex items-start gap-4">
            {/* Foto */}
            <div className="shrink-0 relative group">
              <label className="cursor-pointer block">
                <div className="size-20 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-800/20 ring-1 ring-purple-500/20 overflow-hidden flex items-center justify-center">
                  {perfilFoto ? (
                    <Image src={perfilFoto} alt="" width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera size={22} className="text-purple-400" />
                      <span className="text-[9px] text-purple-400/70 font-bold">Foto</span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
                <input type="file" accept="image/*" onChange={handleUploadFoto} className="hidden" />
              </label>
              {uploadingFoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {editandoPerfil ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-dim font-bold uppercase">Nome</label>
                      <input value={perfilNome} onChange={e => setPerfilNome(e.target.value)} className="w-full bg-page border border-border-input p-2.5 rounded-xl text-sm text-text-primary outline-none focus:border-purple-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-dim font-bold uppercase">Email</label>
                      <input value={perfilEmail} onChange={e => setPerfilEmail(e.target.value)} type="email" className="w-full bg-page border border-border-input p-2.5 rounded-xl text-sm text-text-primary outline-none focus:border-purple-500" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-dim font-bold uppercase">Empresa</label>
                      <input value={perfilEmpresa} onChange={e => setPerfilEmpresa(e.target.value)} className="w-full bg-page border border-border-input p-2.5 rounded-xl text-sm text-text-primary outline-none focus:border-purple-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-dim font-bold uppercase">CNPJ</label>
                      <input value={perfilCnpj} onChange={e => setPerfilCnpj(formatarCnpjPerfil(e.target.value))} className="w-full bg-page border border-border-input p-2.5 rounded-xl text-sm text-text-primary outline-none focus:border-purple-500" />
                    </div>
                  </div>
                  <div className="sm:w-1/2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-dim font-bold uppercase">WhatsApp</label>
                      <input value={perfilTelefone} onChange={e => setPerfilTelefone(formatarTelPerfil(e.target.value))} type="tel" className="w-full bg-page border border-border-input p-2.5 rounded-xl text-sm text-text-primary outline-none focus:border-purple-500" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={salvarPerfil} disabled={salvandoPerfil} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                      {salvandoPerfil ? 'Salvando...' : <><Save size={14} /> Salvar</>}
                    </button>
                    <button onClick={() => setEditandoPerfil(false)} className="flex items-center gap-1.5 px-4 py-2 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl text-xs font-bold transition-all">
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="truncate text-lg font-bold">{session?.user?.name}</h2>
                      <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
                        <Mail size={14} className="shrink-0" />
                        <span className="truncate">{session?.user?.email}</span>
                      </div>
                      {perfilTelefone && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
                          <Phone size={14} className="shrink-0" />
                          <span>{formatarTelPerfil(perfilTelefone)}</span>
                        </div>
                      )}
                      {perfilEmpresa && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
                          <Building2 size={14} className="shrink-0" />
                          <span>{perfilEmpresa}</span>
                          {perfilCnpj && <span className="text-text-dim text-xs">· {formatarCnpjPerfil(perfilCnpj)}</span>}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setEditandoPerfil(true)} className="p-2 text-text-dim hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all" title="Editar perfil">
                      <Edit3 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold uppercase text-purple-300 border border-purple-500/20">
                      <Shield size={12} />
                      {cargo}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Billing Alert */}
        {!loadingFatura && renderBillingAlert()}

        {/* Realizar Pagamento — mostra sempre que não for trial nem cartão */}
        {!loadingFatura && fatura && fatura.billing.phase !== "TRIAL" && fatura.billingMethod !== "CREDIT_CARD" && (
          <div className="rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
                <CreditCard size={16} className="text-emerald-400" />
                Realizar Pagamento
              </h3>
              {fatura.vencimento && isValid(fatura.vencimento) && (
                <p className="text-xs text-text-faint">
                  Vencimento: <span className="text-text-primary font-medium">{formatSafe(fatura.vencimento)}</span>
                  {" "}&middot;{" "}
                  <span className="text-emerald-400 font-bold">
                    R$ {fatura.valor.toFixed(2).replace(".", ",")}
                    {fatura.billingCycle === "YEARLY" ? "/ano" : "/mês"}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => abrirPagamento("PIX")}
                className="group flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5 transition-all hover:border-emerald-500/40 hover:bg-emerald-950/30"
              >
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <QrCode size={24} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm text-emerald-300">Pix</p>
                  <p className="text-[11px] text-emerald-400/50 mt-0.5">QR Code e copia e cola</p>
                </div>
              </button>

              <button
                onClick={() => abrirPagamento("BOLETO")}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border-input bg-surface p-5 transition-all hover:border-border-input hover:bg-elevated"
              >
                <div className="rounded-xl bg-elevated-solid p-3 text-text-muted group-hover:bg-elevated-solid transition-colors">
                  <FileText size={24} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm text-text-secondary">Boleto</p>
                  <p className="text-[11px] text-text-faint mt-0.5">Linha digitável e PDF</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Pagamento automático via cartão */}
        {!loadingFatura && fatura && fatura.billingMethod === "CREDIT_CARD" && fatura.billing.phase !== "TRIAL" && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="font-bold text-emerald-300">Pagamento automático ativo</p>
              <p className="text-sm text-emerald-400/60">
                Cobrança recorrente via cartão de crédito.{" "}
                <Link href="/admin/perfil/pagamento" className="underline hover:text-emerald-300 transition-colors">
                  Gerenciar
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/admin/perfil/plano"
            className="group flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-4 transition-all hover:border-purple-500/30 hover:bg-surface-solid"
          >
            <div className="shrink-0 rounded-xl bg-purple-500/10 p-2.5 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <Crown size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Meu Plano</p>
              <p className="text-[11px] text-text-faint">Assinatura</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-text-dim group-hover:text-purple-400 transition-colors" />
          </Link>

          <Link
            href="/admin/perfil/pagamento"
            className="group flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-4 transition-all hover:border-emerald-500/30 hover:bg-surface-solid"
          >
            <div className="shrink-0 rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <CreditCard size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Pagamento</p>
              <p className="text-[11px] text-text-faint">Ciclo e método</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-text-dim group-hover:text-emerald-400 transition-colors" />
          </Link>

          <Link
            href="/admin/perfil/historico"
            className="group flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-4 transition-all hover:border-border-default hover:bg-surface-solid"
          >
            <div className="shrink-0 rounded-xl bg-elevated-solid p-2.5 text-text-muted group-hover:bg-elevated-solid transition-colors">
              <Receipt size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Histórico</p>
              <p className="text-[11px] text-text-faint">Faturas anteriores</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-text-dim group-hover:text-text-muted transition-colors" />
          </Link>
        </div>

        {/* Alterar Senha */}
        <div className="rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-6">
          <h3 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            <Lock size={16} className="text-yellow-500" />
            Segurança da Conta
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-faint">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-xl border border-border-input bg-page px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  placeholder="Digite a nova senha"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-faint">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="w-full rounded-xl border border-border-input bg-page px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
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

        {/* Zona de Perigo */}
        <ExcluirContaSection />
      </div>
    </div>
  );
}

function ExcluirContaSection() {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const podeExcluir = confirmacao === 'EXCLUIR MINHA CONTA' && senha.length >= 1;

  const excluir = async () => {
    if (!podeExcluir) return;
    setExcluindo(true);
    try {
      const res = await axios.delete('/api/admin/excluir-conta', {
        data: { confirmacao, senha },
      });
      if (res.data.ok) {
        alert('Conta excluída com sucesso. Você será redirecionado.');
        window.location.href = '/';
      }
    } catch (err: any) {
      alert(err.response?.data?.erro || 'Erro ao excluir conta');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-3 w-full text-left"
      >
        <div className="bg-red-500/10 p-2 rounded-xl">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-400">Zona de Perigo</p>
          <p className="text-[11px] text-text-dim">Excluir conta e todos os dados da empresa</p>
        </div>
        <ChevronRight size={16} className={`text-red-400 transition-transform ${aberto ? 'rotate-90' : ''}`} />
      </button>

      {aberto && (
        <div className="mt-4 space-y-4 pt-4 border-t border-red-500/10">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-sm text-red-300 font-bold mb-1">Esta ação é irreversível!</p>
            <p className="text-xs text-red-300/70">
              Ao excluir sua conta, todos os dados serão permanentemente removidos: empresa, funcionários, registros de ponto, relatórios, ausências e configurações. Não é possível recuperar.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-text-muted font-bold uppercase ml-1">
                Digite sua senha para confirmar
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Sua senha atual"
                className="w-full bg-page border border-red-500/20 p-3 rounded-xl text-text-primary text-sm outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-text-muted font-bold uppercase ml-1">
                Digite <span className="text-red-400">EXCLUIR MINHA CONTA</span> para confirmar
              </label>
              <input
                type="text"
                value={confirmacao}
                onChange={e => setConfirmacao(e.target.value)}
                placeholder="EXCLUIR MINHA CONTA"
                className="w-full bg-page border border-red-500/20 p-3 rounded-xl text-text-primary text-sm outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            onClick={excluir}
            disabled={!podeExcluir || excluindo}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-elevated-solid disabled:text-text-faint text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            {excluindo ? 'Excluindo...' : <><AlertTriangle size={16} /> Excluir minha conta permanentemente</>}
          </button>
        </div>
      )}
    </div>
  );
}
