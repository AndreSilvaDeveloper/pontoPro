"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { base64UrlDecodeUtf8 } from "@/lib/base64url";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "workid_billing_block";

type BlockPayload = {
  code?: string;
  motivo?: string;
  empresaNome?: string;
  email?: string;
  pixKey?: string | null;
  whatsapp?: string | null;
  dueAt?: string;
  days?: number;
  at?: string;
};

// helper: abre link como o Histórico (target=_blank) com fallback
function openInNewTab(url: string) {
  // 1) tenta window.open simples (mais compatível p/ Asaas)
  const w = window.open(url, "_blank");
  if (w) return;

  // 2) fallback: cria <a> e dispara click
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function BloqueadoPage() {
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [payload, setPayload] = useState<BlockPayload | null>(null);

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [checking, setChecking] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  const fetchStatus = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setChecking(true);

    try {
      const r = await fetch("/api/empresa/billing-status", { cache: "no-store" });
      const j = r.ok ? await r.json() : { ok: false };

      setData(j);

      const isBlocked =
        j?.blocked === true ||
        j?.status?.blocked === true ||
        j?.billing?.blocked === true ||
        j?.billing?.code === "BLOCKED" ||
        j?.billing?.code === "MANUAL_BLOCK" ||
        j?.ok === false;

      if (!isBlocked) {
        setAutoMsg("Pagamento identificado. Redirecionando...");
        router.replace("/admin");
      }
    } catch {
      setData({ ok: false });
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const abrirPagamento = async () => {
    setPayLoading(true);
    setPayError(null);

    try {
      // 1) tenta pegar cobrança atual
      const r1 = await fetch("/api/admin/asaas/cobranca-atual", { cache: "no-store" });
      const j1 = await r1.json();

      let asaas = j1?.hasPayment ? j1?.asaas : null;

      // 2) se não tiver link, gera
      // (aceita endpoints que retornem { ok, asaas: {...} } ou { hasPayment, asaas: {...} })
      const resolveUrlFromAsaas = (obj: any): string | null => {
        if (!obj) return null;

        // ✅ PRIORIDADE: BOLETO Pix (invoice do PIX)
        const pixInvoice =
          obj?.pix?.invoiceUrl ??
          obj?.asaas?.pix?.invoiceUrl ??
          obj?.pixInvoiceUrl ??
          null;

        if (pixInvoice) return pixInvoice;

        // fallback: invoiceUrl genérico (alguns endpoints retornam direto)
        const invoice =
          obj?.invoiceUrl ??
          obj?.asaas?.invoiceUrl ??
          null;

        if (invoice) return invoice;

        // fallback: boleto url/pdf se existir
        const boletoUrl =
          obj?.boleto?.boletoUrl ??
          obj?.boleto?.bankSlipUrl ??
          obj?.bankSlipUrl ??
          obj?.boletoUrl ??
          null;

        if (boletoUrl) return boletoUrl;

        return null;
      };

      let url = resolveUrlFromAsaas(asaas);

      if (!url) {
        const r2 = await fetch("/api/admin/asaas/gerar-cobranca", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const text = await r2.text();
        let j2: any = null;
        try {
          j2 = text ? JSON.parse(text) : null;
        } catch {
          throw new Error("API não retornou JSON ao gerar cobrança.");
        }

        if (!r2.ok || !j2?.ok) throw new Error(j2?.error || "Falha ao gerar cobrança");

        asaas = j2?.asaas ?? null;
        url = resolveUrlFromAsaas(asaas);
      }

      if (!url) {
        throw new Error("Não foi possível obter o link do BOLETO Pix no Asaas.");
      }

      // ✅ abre como o Histórico
      openInNewTab(url);
    } catch (e: any) {
      setPayError(e?.message || "Erro ao abrir pagamento");
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // 1) tenta ler payload local
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const decoded = base64UrlDecodeUtf8<BlockPayload>(raw);
        setPayload(decoded);
      }
    } catch {
      // ignore
    }

    // 2) primeira busca + polling
    fetchStatus();

    intervalRef.current = window.setInterval(() => {
      if (mountedRef.current) fetchStatus({ silent: true });
    }, 10_000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empresa = data?.empresa;
  const billing = data?.billing;

  const nomeEmpresa = empresa?.nome || payload?.empresaNome || "Empresa";
  const motivo = billing?.message || payload?.motivo || "Pendência financeira ou teste expirado.";

  const pixKey = empresa?.chavePix || payload?.pixKey || null;
  const whatsapp = (empresa?.cobrancaWhatsapp || payload?.whatsapp || "5532991473554")?.replace(
    /\D/g,
    ""
  );

  const whatsappMsg = useMemo(() => {
    const base = `Olá! Preciso regularizar meu acesso no WorkID.\nEmpresa: ${nomeEmpresa}\nMotivo: ${motivo}\nE-mail: ${
      payload?.email || ""
    }\n\nVou enviar o comprovante aqui.`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(base)}`;
  }, [whatsapp, nomeEmpresa, motivo, payload?.email]);

  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 shadow-2xl shadow-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Acesso suspenso</CardTitle>
          <CardDescription className="text-gray-400">Empresa: {nomeEmpresa}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-gray-300">
          <div className="rounded-lg border border-purple-500/20 bg-[#0a0e27]/50 p-4 text-sm">
            <p className="font-semibold text-white">Motivo</p>
            <p className="text-gray-300 mt-1">{motivo}</p>

            {pixKey && (
              <>
                <p className="font-semibold text-white mt-4">Chave Pix</p>
                <p className="mt-1 text-xs break-all select-all">{pixKey}</p>
              </>
            )}
          </div>

          {/* ✅ Mobile: empilha | Desktop: lado a lado */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <Link href="/login">Voltar</Link>
            </Button>

            <Button
              asChild
              type="button"
              className="w-full bg-transparent text-white border border-white/15 hover:bg-white/10 hover:text-white"
            >
              <a href={whatsappMsg} target="_blank" rel="noreferrer">
                Enviar comprovante
              </a>
            </Button>
          </div>

          {/* ✅ Botão para abrir BOLETO Pix */}
          {data?.ok && (
            <>
              <Button
                type="button"
                onClick={abrirPagamento}
                disabled={payLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {payLoading ? "Abrindo BOLETO Pix..." : "Realizar pagamento"}
              </Button>

              {payError && <p className="text-center text-xs text-red-400">{payError}</p>}
            </>
          )}

          <p className="text-center text-xs text-gray-500">
            {autoMsg
              ? autoMsg
              : checking
              ? "Verificando status de pagamento..."
              : "Verificação automática a cada 10s. Após pagar, esta tela será liberada automaticamente."}
          </p>

          <Button type="button" variant="secondary" onClick={() => fetchStatus()} className="w-full">
            Já paguei, atualizar agora
          </Button>

          <p className="text-center text-xs text-gray-500">
            Se você já pagou, envie o comprovante no WhatsApp para baixa manual.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
