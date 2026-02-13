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
  const w = window.open(url, "_blank");
  if (w) return;

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

  // resolve o melhor link possível (prioriza BOLETO Pix)
  const resolveUrlFromAsaas = (obj: any): string | null => {
    if (!obj) return null;

    // ✅ PRIORIDADE: invoice do PIX (BOLETO Pix)
    const pixInvoice =
      obj?.pix?.invoiceUrl ??
      obj?.asaas?.pix?.invoiceUrl ??
      obj?.pixInvoiceUrl ??
      null;

    if (pixInvoice) return pixInvoice;

    // fallback: invoiceUrl genérico (checkout)
    const invoice = obj?.invoiceUrl ?? obj?.asaas?.invoiceUrl ?? null;
    if (invoice) return invoice;

    // fallback: boleto url/pdf
    const boletoUrl =
      obj?.boleto?.boletoUrl ??
      obj?.boleto?.bankSlipUrl ??
      obj?.bankSlipUrl ??
      obj?.boletoUrl ??
      null;

    if (boletoUrl) return boletoUrl;

    return null;
  };

  // helper: lê resposta como JSON quando possível, senão tenta extrair mensagem
  const safeJson = async (r: Response) => {
    const text = await r.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      // se veio HTML/texto, devolve algo "parseável"
      return { ok: false, error: text.slice(0, 300) };
    }
  };

  try {
    // 1) tenta pegar cobrança atual
    let asaas: any = null;

    const r1 = await fetch("/api/admin/asaas/cobranca-atual", { cache: "no-store" });
    const j1 = await safeJson(r1);

    // aceita formatos:
    // { hasPayment: true, asaas: {...} }
    // { ok: true, asaas: {...} }
    // { asaas: {...} }
    if (r1.ok) {
      if (j1?.hasPayment === true) asaas = j1?.asaas ?? null;
      else if (j1?.ok === true) asaas = j1?.asaas ?? null;
      else if (j1?.asaas) asaas = j1.asaas;
    }

    let url = resolveUrlFromAsaas(asaas);

    // 2) se não tem cobrança/link, gera agora
    if (!url) {
      const r2 = await fetch("/api/admin/asaas/gerar-cobranca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const j2 = await safeJson(r2);

      if (!r2.ok || j2?.ok === false) {
        throw new Error(j2?.error || "Falha ao gerar cobrança no Asaas.");
      }

      asaas = j2?.asaas ?? j2;
      url = resolveUrlFromAsaas(asaas);
    }

    // 3) se ainda não tem url, erro claro
    if (!url) {
      throw new Error("Não foi possível obter o link do BOLETO Pix (invoice) no Asaas.");
    }

    // 4) abre
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
  const whatsapp = (empresa?.cobrancaWhatsapp || payload?.whatsapp || "5532935005492")?.replace(
    /\D/g,
    ""
  );

  const whatsappMsg = useMemo(() => {
    const base = `Olá! Preciso regularizar meu acesso no WorkID.\nEmpresa: ${nomeEmpresa}\nMotivo: ${motivo}\nE-mail: ${
      payload?.email || ""
    }\n\nVou enviar o comprovante aqui.`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(base)}`;
  }, [whatsapp, nomeEmpresa, motivo, payload?.email]);

  // ✅ Corrige o bug do botão na Vercel:
  // Mostra ações de pagamento sempre que a tela estiver em modo bloqueado
  const isBlocked =
    data == null ||
    data?.blocked === true ||
    data?.status?.blocked === true ||
    data?.billing?.blocked === true ||
    data?.billing?.code === "BLOCKED" ||
    data?.billing?.code === "MANUAL_BLOCK" ||
    data?.ok === false;

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
              <div className="mt-4 space-y-2">
                <p className="font-semibold text-white">Chave Pix</p>

                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs break-all select-all">{pixKey}</p>

                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(pixKey);
                        setAutoMsg("Chave Pix copiada ✅");
                        window.setTimeout(() => setAutoMsg(null), 2500);
                      } catch {
                        setAutoMsg("Não consegui copiar automaticamente. Copie manualmente.");
                        window.setTimeout(() => setAutoMsg(null), 3000);
                      }
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ✅ AÇÕES PRINCIPAIS (melhor UX) */}
          {isBlocked && (
            <div className="space-y-2">
              <Button
                type="button"
                onClick={abrirPagamento}
                disabled={payLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {payLoading ? "Abrindo BOLETO Pix..." : "Realizar pagamento"}
              </Button>

              <Button
                type="button"
                className="w-full bg-transparent text-white border border-white/15 hover:bg-white/10 hover:text-white"
                onClick={() => openInNewTab(whatsappMsg)}
              >
                Enviar comprovante no WhatsApp
              </Button>

              {payError && <p className="text-center text-xs text-red-400">{payError}</p>}
            </div>
          )}

          <p className="text-center text-xs text-gray-500">
            {autoMsg
              ? autoMsg
              : checking
              ? "Verificando status de pagamento..."
              : "Verificação automática a cada 10s. Após pagar, esta tela será liberada automaticamente."}
          </p>

          {/* ✅ AÇÕES SECUNDÁRIAS */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <Link href="/login">Voltar</Link>
            </Button>

            {/* <Button type="button" variant="secondary" onClick={() => fetchStatus()} className="w-full">
              Já paguei, atualizar
            </Button> */}
          </div>

          <p className="text-center text-xs text-gray-500">
            Se você já pagou, envie o comprovante no WhatsApp para baixa manual.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
