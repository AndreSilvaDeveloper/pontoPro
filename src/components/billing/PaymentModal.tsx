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
  boletoPdfUrl?: string | null;
};

function clsx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function formatDueDate(raw: string | null) {
  if (!raw) return "---";
  const parts = raw.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return raw;
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

  const boletoPdfUrl = useMemo(() => {
    const b = asaas?.boleto;
    return boletoPdfUrlProp ?? b?.bankSlipUrl ?? b?.boletoUrl ?? null;
  }, [asaas, boletoPdfUrlProp]);

  const pixPayload = asaas?.pix?.pix?.payload ?? null;
  const pixQr = asaas?.pix?.pix?.encodedImage ?? null;
  const hasPix = Boolean(pixPayload || pixQr);

  const faturaUrl = asaas?.pix?.invoiceUrl ?? asaas?.boleto?.invoiceUrl ?? null;
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 shadow-2xl sm:rounded-2xl flex flex-col max-h-[100dvh] sm:max-h-[90dvh] overflow-hidden min-h-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Pagamento</h3>
              <p className="text-xs text-slate-400">
                Vencimento: <span className="text-white font-medium">{formatDueDate(asaas?.dueDate ?? null)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
            {hasPix && (
              <button
                onClick={() => setTab("PIX")}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  tab === "PIX"
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
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
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
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
            className="p-2 text-slate-400 hover:text-emerald-400 disabled:opacity-50 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Toast */}
        {msg && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl animate-bounce">
            <CheckCircle2 size={14} /> {msg}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {tab === "PIX" && (
            <div className="flex flex-col items-center">
              {/* QR Code */}
              <div className="bg-white p-3 rounded-2xl mb-5 shadow-xl">
                {pixQr ? (
                  <img
                    src={`data:image/png;base64,${pixQr}`}
                    alt="QR Code Pix"
                    className="w-48 h-48 sm:w-56 sm:h-56"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-center text-sm p-4">
                    Gerando QR Code...
                  </div>
                )}
              </div>

              {/* Copy PIX button */}
              <button
                onClick={() => pixPayload && copiar(pixPayload, "Codigo PIX copiado!")}
                disabled={!pixPayload}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 transition-all flex items-center justify-center gap-2 mb-3"
              >
                <Copy size={16} />
                Copiar codigo Pix
              </button>

              {/* Pix copia e cola */}
              <div className="w-full">
                <p className="text-xs text-slate-500 mb-2 text-center">Ou copie o codigo abaixo:</p>
                <button
                  onClick={() => pixPayload && copiar(pixPayload, "Codigo PIX copiado!")}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-3 rounded-xl flex items-center justify-between transition-all group"
                >
                  <code className="text-[10px] text-slate-400 font-mono truncate mr-3 max-w-[75%] text-left">
                    {pixPayload || "Carregando..."}
                  </code>
                  <span className="text-emerald-400 text-xs font-bold shrink-0 flex items-center gap-1">
                    <Copy size={14} />
                  </span>
                </button>
              </div>

              {/* Ver fatura link */}
              {faturaUrl && (
                <a
                  href={faturaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  Ver fatura completa <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {tab === "BOLETO" && (
            <div className="space-y-4">
              {/* Linha digitavel */}
              {asaas?.boleto?.identificationField && (
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <h4 className="text-white font-semibold mb-3 text-sm">Linha digitavel</h4>
                  <div className="bg-black/30 p-3 rounded-lg border border-slate-700/50 mb-3">
                    <code className="text-sm text-emerald-300 font-mono break-all">
                      {asaas.boleto.identificationField}
                    </code>
                  </div>
                  <button
                    onClick={() => copiar(asaas.boleto!.identificationField!, "Linha copiada!")}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={14} /> Copiar linha digitavel
                  </button>
                </div>
              )}

              {/* PDF boleto */}
              {boletoPdfUrl && (
                <a
                  href={boletoPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <span className="block text-white font-medium text-sm">Baixar boleto PDF</span>
                      <span className="text-xs text-slate-500">Abrir em nova aba</span>
                    </div>
                  </div>
                  <ExternalLink size={18} className="text-slate-500 group-hover:text-white" />
                </a>
              )}

              {/* Ver fatura link */}
              {faturaUrl && (
                <a
                  href={faturaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors pt-2"
                >
                  Ver fatura completa <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-950/50 border-t border-slate-800 flex gap-3">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar cobranca
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
