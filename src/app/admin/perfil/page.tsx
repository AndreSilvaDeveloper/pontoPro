// src/app/admin/perfil/page.tsx
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
} from "lucide-react";
import { useSession } from "next-auth/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, differenceInDays } from "date-fns";
import type { BillingStatus } from "@/lib/billing";

// === FUNÇÕES AUXILIARES DE PIX (mantidas) ===
const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const emv = (id: string, value: string) => `${id}${value.length.toString().padStart(2, "0")}${value}`;
const crc16ccitt = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) > 0 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
};
const formatarChaveParaPayload = (chave: string) => {
  const limpa = chave.trim();
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(limpa)) return limpa;
  if (limpa.includes("@")) return limpa;
  if (limpa.startsWith("+")) return limpa;
  return limpa.replace(/[^0-9]/g, "");
};
const gerarPayloadPix = (chave: string, nome: string, cidade: string, valor?: string, txid: string = "***") => {
  const chaveFormatada = formatarChaveParaPayload(chave);
  const nomeLimpo = normalizeText(nome).substring(0, 25);
  const cidadeLimpa = normalizeText(cidade).substring(0, 15);

  let payload =
    emv("00", "01") +
    emv("26", emv("00", "BR.GOV.BCB.PIX") + emv("01", chaveFormatada)) +
    emv("52", "0000") +
    emv("53", "986");

  if (valor) payload += emv("54", parseFloat(valor).toFixed(2));

  payload += emv("58", "BR") + emv("59", nomeLimpo) + emv("60", cidadeLimpa) + emv("62", emv("05", txid)) + "6304";
  return payload + crc16ccitt(payload);
};

type FaturaState = {
  empresa: any;
  billing: BillingStatus;
  valor: number;
  vencimento: Date;
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
  const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const [fatura, setFatura] = useState<FaturaState | null>(null);
  const [loadingFatura, setLoadingFatura] = useState(true);

  useEffect(() => {
    carregarDadosFinanceiros();
  }, []);

  const carregarDadosFinanceiros = async () => {
    try {
      const res = await axios.get("/api/admin/fatura");
      if (!res.data?.ok) return;

      // se for filial, você pode optar por esconder
      if (res.data?.empresa?.isFilial) {
        setLoadingFatura(false);
        return;
      }

      const vencISO = res.data?.fatura?.vencimentoISO;
      const venc = vencISO ? new Date(vencISO) : new Date();

      setFatura({
        empresa: res.data.empresa,
        billing: res.data.billing,
        valor: res.data.fatura.valor,
        vencimento: venc,
        chavePix: res.data.empresa?.chavePix && String(res.data.empresa.chavePix).length > 3
          ? String(res.data.empresa.chavePix)
          : "118.544.546-33",
        pago: Boolean(res.data.fatura.pago),
        itens: res.data.fatura.itens,
      });
    } catch (e) {
      console.error("Erro ao carregar financeiro", e);
    } finally {
      setLoadingFatura(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (senha !== confirmar) return setMsg({ tipo: "erro", texto: "As senhas não conferem." });
    if (senha.length < 4) return setMsg({ tipo: "erro", texto: "A senha precisa ter no mínimo 4 caracteres." });

    setLoading(true);
    try {
      await axios.post("/api/auth/trocar-senha", { novaSenha: senha });
      setMsg({ tipo: "sucesso", texto: "Senha alterada com sucesso!" });
      setSenha("");
      setConfirmar("");
    } catch (error: any) {
      setMsg({ tipo: "erro", texto: "Erro ao salvar: " + (error.response?.data?.erro || "Tente novamente.") });
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
      doc.text(`VENCIMENTO: ${format(fatura.vencimento, "dd/MM/yyyy")}`, 195, 20, { align: "right" });

      doc.setFontSize(14);
      doc.text(
        `TOTAL: ${fatura.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
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
        foot: [[ "", "", "TOTAL A PAGAR", fatura.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ]],
        footStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: "bold", halign: "right" },
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
    } catch (e) {
      if (janela) janela.close();
      alert("Erro ao gerar boleto.");
    }
  };

  const renderAlertasFinanceiros = () => {
    if (!fatura) return null;

    // TRIAL
    if (fatura.billing.phase === "TRIAL") {
      return (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-amber-900/50 p-2.5 rounded-full text-amber-300">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="font-bold text-amber-300 text-lg">Período de teste ativo</h3>
              <p className="text-amber-200/70 text-sm">
                Restam <b>{fatura.billing.days ?? "—"}</b> dias (até {format(fatura.vencimento, "dd/MM/yyyy")}).
              </p>
            </div>
          </div>
          <button
            onClick={baixarBoleto}
            className="bg-amber-500 hover:bg-amber-600 text-black px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
          >
            <FileText size={16} /> VER FATURA
          </button>
        </div>
      );
    }

    // PAGO
    if (fatura.pago) {
      return (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-900/50 p-2.5 rounded-full text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-emerald-400 text-lg">Fatura Paga</h3>
              <p className="text-emerald-200/70 text-sm">Obrigado! Sua assinatura está em dia.</p>
            </div>
          </div>
        </div>
      );
    }

    // Billing normal (usa vencimento da API)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dataVenc = new Date(fatura.vencimento); dataVenc.setHours(0, 0, 0, 0);
    const diasParaVencimento = differenceInDays(dataVenc, hoje);

    if (diasParaVencimento <= -10) {
      return (
        <div className="bg-slate-900 border-l-4 border-red-600 rounded-r-xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl shadow-red-900/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-red-600/5 animate-pulse pointer-events-none" />
          <div className="flex items-center gap-4 z-10">
            <div className="bg-red-600 p-3 rounded-full text-white">
              <Lock size={28} />
            </div>
            <div>
              <h3 className="font-bold text-red-500 text-xl">BLOQUEIO DE ACESSO</h3>
              <p className="text-slate-300 text-sm mt-1">
                Sua fatura venceu há {Math.abs(diasParaVencimento)} dias. O sistema será bloqueado.
              </p>
            </div>
          </div>
          <button onClick={baixarBoleto} className="z-10 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-sm">
            REGULARIZAR AGORA
          </button>
        </div>
      );
    }

    if (diasParaVencimento < 0) {
      return (
        <div className="bg-red-950/30 border border-red-500/50 rounded-xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-900/50 p-2.5 rounded-full text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-red-400 text-lg">Fatura Vencida</h3>
              <p className="text-red-200/70 text-sm">
                Venceu em {format(fatura.vencimento, "dd/MM")}. Evite bloqueio.
              </p>
            </div>
          </div>
          <button onClick={baixarBoleto} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">
            <FileText size={16} /> 2ª VIA DO BOLETO
          </button>
        </div>
      );
    }

    if (diasParaVencimento >= 0 && diasParaVencimento <= 5) {
      return (
        <div className="bg-yellow-950/30 border border-yellow-500/50 rounded-xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-900/50 p-2.5 rounded-full text-yellow-400">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="font-bold text-yellow-400 text-lg">Fatura em Aberto</h3>
              <p className="text-yellow-200/70 text-sm">
                {diasParaVencimento === 0 ? "Vence HOJE!" : `Vence em ${diasParaVencimento} dias (${format(fatura.vencimento, "dd/MM")}).`}
              </p>
            </div>
          </div>
          <button onClick={baixarBoleto} className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">
            <FileText size={16} /> PAGAR AGORA
          </button>
        </div>
      );
    }

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-900/20 p-2.5 rounded-full text-emerald-500">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Minha Assinatura</h3>
            <p className="text-slate-400 text-sm">
              Próximo vencimento: <span className="text-emerald-400 font-bold">{format(fatura.vencimento, "dd/MM/yyyy")}</span>
            </p>
          </div>
        </div>
        <button onClick={baixarBoleto} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2">
          <FileText size={16} /> VISUALIZAR FATURA
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-purple-400">Meu Perfil</h1>
            <p className="text-slate-400 text-sm">Gerencie sua conta e assinatura</p>
          </div>
          <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft size={20} /> Voltar ao Painel
          </Link>
        </div>

        {!loadingFatura && renderAlertasFinanceiros()}

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center text-purple-400">
            <User size={32} />
          </div>
          <div>
            <h2 className="font-bold text-lg">{session?.user?.name}</h2>
            <p className="text-slate-400">{session?.user?.email}</p>
            <span className="text-xs bg-purple-900 text-purple-200 px-2 py-0.5 rounded uppercase mt-1 inline-block">
              {(session?.user as any)?.cargo}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="font-bold mb-6 flex items-center gap-2 text-white">
            <Lock size={20} className="text-yellow-500" /> Alterar Senha
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nova Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Digite a nova senha"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Confirme a Nova Senha</label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Digite novamente"
                required
              />
            </div>

            {msg && (
              <div className={`p-3 rounded-lg text-sm text-center font-bold ${msg.tipo === "erro" ? "bg-red-900/50 text-red-200" : "bg-green-900/50 text-green-200"}`}>
                {msg.texto}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {loading ? "Salvando..." : (<><Save size={20} /> ATUALIZAR SENHA</>)}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
