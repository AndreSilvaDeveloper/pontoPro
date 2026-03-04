'use client';

import { useState, useEffect } from "react";
import { DollarSign, X, Loader2, ExternalLink, Copy, Check, RefreshCw } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: any;
};

type PaymentData = {
  paymentId: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  identificationField: string | null;
  pix: {
    encodedImage?: string;
    payload?: string;
    expirationDate?: string;
  } | null;
};

type FaturaInfo = {
  ok: boolean;
  empresaNome: string;
  isFilial: boolean;
  billingEmpresaNome: string;
  hasAsaas: boolean;
  hasSubscription: boolean;
  valorAtual: number;
  totalMensal: number;
  cycle: string;
  plano: string;
  payment: PaymentData | null;
};

const statusLabels: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  OVERDUE: { label: "Vencida", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  RECEIVED: { label: "Pago", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  CONFIRMED: { label: "Confirmado", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

export default function ModalFatura({ open, onOpenChange, empresa }: Props) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<FaturaInfo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open && empresa?.id) {
      loadFatura();
    }
    return () => {
      setInfo(null);
      setErro(null);
    };
  }, [open, empresa?.id]);

  const loadFatura = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/saas/fatura-asaas?empresaId=${empresa.id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.erro || "Erro");
      setInfo(data);
    } catch (e: any) {
      setErro(e.message || "Erro ao consultar fatura");
    } finally {
      setLoading(false);
    }
  };

  const gerarCobranca = async () => {
    setGenerating(true);
    setErro(null);
    try {
      const res = await fetch("/api/saas/fatura-asaas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: empresa.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.erro || "Erro ao gerar cobrança");
      // Recarrega para mostrar os dados atualizados
      await loadFatura();
    } catch (e: any) {
      setErro(e.message || "Erro ao gerar cobrança");
    } finally {
      setGenerating(false);
    }
  };

  const copyPix = async (payload: string) => {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open || !empresa) return null;

  const payment = info?.payment;
  const statusCfg = payment ? statusLabels[payment.status] || { label: payment.status, cls: "bg-slate-700 text-slate-300 border-slate-600" } : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-lg relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold mb-1 text-white flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-500" /> Fatura Asaas
        </h3>

        <p className="text-sm text-gray-400 mb-4">
          {empresa.nome}
          {info?.isFilial && (
            <span className="text-xs text-yellow-400 ml-2">(cobra via {info.billingEmpresaNome})</span>
          )}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : erro ? (
          <div className="text-center py-6">
            <p className="text-red-400 text-sm mb-3">{erro}</p>
            <button
              onClick={loadFatura}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={14} /> Tentar novamente
            </button>
          </div>
        ) : info ? (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Plano</p>
                <p className="text-sm font-bold text-white">{info.plano}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Valor</p>
                <p className="text-sm font-bold text-emerald-400">
                  {info.valorAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Ciclo</p>
                <p className="text-sm font-bold text-white">{info.cycle === "YEARLY" ? "Anual" : "Mensal"}</p>
              </div>
            </div>

            {/* Cobrança existente */}
            {payment ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Cobrança Atual</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusCfg?.cls}`}>
                    {statusCfg?.label}
                  </span>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor</span>
                    <span className="text-white font-bold">
                      {Number(payment.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vencimento</span>
                    <span className="text-white">
                      {payment.dueDate ? new Date(payment.dueDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID Asaas</span>
                    <span className="text-xs text-slate-500 font-mono">{payment.paymentId}</span>
                  </div>
                </div>

                {/* PIX QR Code */}
                {payment.pix?.encodedImage && (
                  <div className="bg-gray-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-400 mb-2 uppercase font-bold">PIX QR Code</p>
                    <img
                      src={`data:image/png;base64,${payment.pix.encodedImage}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto rounded-lg bg-white p-2"
                    />
                    {payment.pix.payload && (
                      <button
                        onClick={() => copyPix(payment.pix!.payload!)}
                        className="mt-3 flex items-center gap-2 mx-auto text-sm bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                      >
                        {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar código PIX</>}
                      </button>
                    )}
                  </div>
                )}

                {/* Links */}
                <div className="flex flex-wrap gap-2">
                  {payment.invoiceUrl && (
                    <a
                      href={payment.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-lg hover:bg-blue-600/30 transition-colors"
                    >
                      <ExternalLink size={14} /> Fatura Online
                    </a>
                  )}
                  {payment.bankSlipUrl && (
                    <a
                      href={payment.bankSlipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg hover:bg-emerald-600/30 transition-colors"
                    >
                      <ExternalLink size={14} /> Boleto PDF
                    </a>
                  )}
                </div>

                {/* Linha digitável do boleto */}
                {payment.identificationField && (
                  <div className="bg-gray-800 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Linha Digitável</p>
                    <p className="text-xs font-mono text-slate-300 break-all select-all">{payment.identificationField}</p>
                  </div>
                )}

                {/* Botão atualizar */}
                <button
                  onClick={loadFatura}
                  className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <RefreshCw size={14} /> Atualizar status
                </button>
              </div>
            ) : (
              /* Sem cobrança pendente */
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm mb-4">Nenhuma cobrança pendente no Asaas.</p>
                <button
                  onClick={gerarCobranca}
                  disabled={generating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 mx-auto disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <><Loader2 className="animate-spin" size={16} /> Gerando...</>
                  ) : (
                    <><DollarSign size={16} /> Gerar Cobrança Asaas</>
                  )}
                </button>
                {!info.hasAsaas && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Cliente ainda não tem cadastro no Asaas. Será criado automaticamente.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
