"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  QrCode,
  FileText,
  ExternalLink,
  Copy,
  RefreshCw,
  Receipt,
  CheckCircle2,
} from "lucide-react";

type AsaasPix = {
  success: boolean;
  encodedImage: string;
  payload: string;
  expirationDate?: string;
  description?: string;
};

export type AsaasBundle = {
  dueDate: string | null;
  pix: {
    paymentId: string;
    invoiceUrl: string | null;
    pix: AsaasPix | null;
  } | null;
  boleto: {
    paymentId: string;
    invoiceUrl: string | null;
    bankSlipUrl: string | null;
    boletoUrl?: string | null;
    identificationField: string | null;
  } | null;
};

type PayTab = "PIX" | "BOLETO";

type Props = {
  open: boolean;
  onClose: () => void;
  asaas: AsaasBundle | null;
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onGenerate: () => Promise<void> | void;
  msg?: string | null;
  setMsg?: (v: string | null) => void;

  // opcional: se você tiver um PDF de boleto externo (não Asaas)
  boletoPdfUrl?: string | null;
};

function clsx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function PaymentModal({
  open,
  onClose,
  asaas,
  loading,
  onRefresh,
  onGenerate,
  msg,
  setMsg,
  boletoPdfUrl: boletoPdfUrlProp,
}: Props) {
  const [tab, setTab] = useState<PayTab>("PIX");

  // se algum dia existir boleto no bundle, ok; se não, use a prop externa
  const boletoPdfUrl = useMemo(() => {
    const b = asaas?.boleto;
    return boletoPdfUrlProp ?? b?.bankSlipUrl ?? b?.boletoUrl ?? null;
  }, [asaas, boletoPdfUrlProp]);

  const pixPayload = asaas?.pix?.pix?.payload ?? null;
  const pixQr = asaas?.pix?.pix?.encodedImage ?? null;

  const hasPix = Boolean(pixPayload || pixQr);

  // ✅ link "BOLETO Pix" (invoice do Asaas) — é o que abre igual no Histórico
  const boletoPixUrl = asaas?.pix?.invoiceUrl ?? asaas?.boleto?.invoiceUrl ?? null;

  // ✅ aba BOLETO só aparece se tiver linha digitável ou PDF externo
  const hasBoleto = Boolean(boletoPdfUrl || asaas?.boleto?.identificationField);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (hasPix) setTab("PIX");
    else if (hasBoleto) setTab("BOLETO");
  }, [open, hasPix, hasBoleto]);

  const openExternal = (url: string) => {
    // mantém para PDFs externos, mas para o Asaas invoice usamos <a target="_blank">
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copiar = async (texto: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setMsg?.(okMsg);
      setTimeout(() => setMsg?.(null), 2000);
    } catch {
      setMsg?.("Erro ao copiar.");
      setTimeout(() => setMsg?.(null), 2000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 shadow-2xl sm:rounded-3xl flex flex-col max-h-[100dvh] sm:max-h-[90dvh] overflow-hidden min-h-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">Pagamento</h3>
              <p className="text-xs text-slate-500">
                Vence em: <span className="text-slate-300">{asaas?.dueDate || "—"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ abre igual no Histórico */}
            {boletoPixUrl ? (
              <a
                href={boletoPixUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold"
                title="Abrir BOLETO Pix (Asaas)"
              >
                <FileText size={16} />
                BOLETO Pix
                <ExternalLink size={16} />
              </a>
            ) : null}

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs + ações */}
        <div className="px-6 py-2 bg-slate-900/50 border-b border-slate-800/50 flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {hasPix && (
              <button
                onClick={() => setTab("PIX")}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  tab === "PIX"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <QrCode size={16} />
                Pix
              </button>
            )}

            {hasBoleto && (
              <button
                onClick={() => setTab("BOLETO")}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  tab === "BOLETO"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <FileText size={16} />
                Boleto
              </button>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-indigo-400 disabled:opacity-50 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Feedback Toast */}
        {msg && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10 bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-bounce shadow-xl">
            <CheckCircle2 size={14} /> {msg}
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {tab === "PIX" && (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-4 rounded-2xl mb-4 shadow-2xl">
                {pixQr ? (
                  <img
                    src={`data:image/png;base64,${pixQr}`}
                    alt="QR Code"
                    className="w-52 h-52 sm:w-60 sm:h-60"
                  />
                ) : (
                  <div className="w-60 h-60 flex items-center justify-center text-slate-400 text-center text-sm p-4">
                    Gerando QR Code...
                  </div>
                )}
              </div>

              {/* ✅ ações PIX */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => pixPayload && copiar(pixPayload, "Código PIX copiado!")}
                  disabled={!pixPayload}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-950 hover:bg-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  COPIAR PIX
                </button>

                {/* ✅ abre igual no Histórico */}
                {boletoPixUrl ? (
                  <a
                    href={boletoPixUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-200 border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    title="Abrir BOLETO Pix (Asaas)"
                  >
                    <FileText size={16} />
                    BOLETO Pix <ExternalLink size={16} />
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-200 border border-slate-700 bg-slate-800 opacity-60 flex items-center justify-center gap-2"
                    title="Link ainda não disponível"
                  >
                    <FileText size={16} />
                    BOLETO Pix
                  </button>
                )}
              </div>

              {/* copia e cola */}
              <div className="w-full space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="text-slate-200 font-semibold">Pix Copia e Cola</h4>
                  <p className="text-xs text-slate-500">Toque abaixo para copiar o código</p>
                </div>

                <button
                  onClick={() => pixPayload && copiar(pixPayload, "Código PIX copiado!")}
                  className="w-full group relative bg-slate-800 hover:bg-slate-700 border border-slate-700 p-4 rounded-2xl flex items-center justify-between transition-all"
                >
                  <code className="text-[10px] sm:text-xs text-slate-300 font-mono truncate mr-4 max-w-[70%] text-left">
                    {pixPayload || "Carregando código..."}
                  </code>
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs shrink-0">
                    <Copy size={16} />
                    COPIAR
                  </div>
                </button>
              </div>
            </div>
          )}

          {tab === "BOLETO" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              {/* Linha digitável (se existir) */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 text-center">
                <h4 className="text-slate-200 font-semibold mb-2 text-lg text-left">
                  Linha Digitável
                </h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <code className="text-sm text-indigo-300 font-mono break-all text-left">
                    {asaas?.boleto?.identificationField || "Sem linha digitável disponível."}
                  </code>
                  <button
                    onClick={() =>
                      asaas?.boleto?.identificationField &&
                      copiar(asaas.boleto.identificationField, "Linha copiada!")
                    }
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    disabled={!asaas?.boleto?.identificationField}
                  >
                    <Copy size={14} /> Copiar Linha
                  </button>
                </div>
              </div>

              {/* PDF boleto (se existir) */}
              {boletoPdfUrl && (
                <button
                  onClick={() => openExternal(boletoPdfUrl)}
                  className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <span className="block text-slate-200 font-medium">Visualizar PDF</span>
                      <span className="text-xs text-slate-500">Abrir em nova aba</span>
                    </div>
                  </div>
                  <ExternalLink size={18} className="text-slate-500 group-hover:text-slate-200" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950/50 border-t border-slate-800/50 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            RECRIAR COBRANÇA
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-950 hover:bg-white transition-colors"
          >
            CONCLUÍDO
          </button>
        </div>
      </div>
    </div>
  );
}
