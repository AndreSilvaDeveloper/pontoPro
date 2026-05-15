"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { base64UrlDecodeUtf8 } from "@/lib/base64url";
import { useRouter } from "next/navigation";
import PaymentModal, { type AsaasBundle } from "@/components/billing/PaymentModal";

const STORAGE_KEY = "workid_billing_block";

type BlockPayload = {
  code?: string;
  motivo?: string;
  empresaNome?: string;
  email?: string;
  cargo?: string | null;
  pixKey?: string | null;
  whatsapp?: string | null;
  dueAt?: string;
  days?: number;
  at?: string;
};

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
  const [suporteBaseUrl, setSuporteBaseUrl] = useState<string | null>(null);

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [checking, setChecking] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  // PaymentModal state
  const [asaasBundle, setAsaasBundle] = useState<AsaasBundle | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  const fetchStatus = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setChecking(true);

    try {
      const r = await fetch("/api/empresa/billing-status", { cache: "no-store" });
      const j = r.ok ? await r.json() : { ok: false };
      setData(j);

      const isBlocked = Boolean(j?.billing?.blocked) || j?.ok === false;

      if (!isBlocked) {
        setAutoMsg("Acesso liberado. Redirecionando...");
        router.replace("/admin");
      }
    } catch {
      setData({ ok: false });
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const safeJson = async (r: Response) => {
    const text = await r.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: text.slice(0, 300) };
    }
  };

  const carregarFatura = async (): Promise<AsaasBundle | null> => {
    const r1 = await fetch("/api/admin/asaas/cobranca-atual", { cache: "no-store" });
    const j1 = await safeJson(r1);
    if (r1.ok && j1?.hasPayment) return j1.asaas ?? null;
    return null;
  };

  const gerarCobranca = async (): Promise<AsaasBundle | null> => {
    const r = await fetch("/api/admin/asaas/gerar-cobranca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const j = await safeJson(r);
    if (!r.ok || j?.ok === false) {
      throw new Error(j?.error || "Falha ao gerar cobranca.");
    }
    return j?.asaas ?? null;
  };

  const abrirPagamento = async () => {
    setPayLoading(true);
    setPayError(null);

    try {
      let bundle = await carregarFatura();
      if (!bundle) bundle = await gerarCobranca();
      if (!bundle) throw new Error("Nao foi possivel carregar a fatura.");

      setAsaasBundle(bundle);
      setShowPayment(true);
    } catch (e: any) {
      setPayError(e?.message || "Erro ao carregar fatura");
    } finally {
      setPayLoading(false);
    }
  };

  const refreshFatura = async () => {
    setPayLoading(true);
    try {
      const bundle = await carregarFatura();
      if (bundle) setAsaasBundle(bundle);
    } catch {
      // silent
    } finally {
      setPayLoading(false);
    }
  };

  const recriarCobranca = async () => {
    setPayLoading(true);
    try {
      const bundle = await gerarCobranca();
      if (bundle) setAsaasBundle(bundle);
    } catch (e: any) {
      setPayError(e?.message || "Erro ao gerar cobranca");
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const decoded = base64UrlDecodeUtf8<BlockPayload>(raw);
        setPayload(decoded);
      }
    } catch {
      // ignore
    }

    fetchStatus();

    // Pré-busca o link de suporte (config contato.whatsapp_link) pra montar o botão
    // do WhatsApp de forma síncrona no clique, evitando o popup blocker.
    fetch("/api/me/contato-suporte")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ativo && d?.link) {
          // strip da query string — vamos compor nossa própria mensagem contextual de bloqueio
          setSuporteBaseUrl(String(d.link).split("?")[0]);
        }
      })
      .catch(() => {
        // silencioso — fallback do botão tenta de novo no clique
      });

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

  const ADMIN_CARGOS = ["ADMIN", "SUPER_ADMIN", "DONO"];
  const isAdmin =
    data?.isAdmin === true ||
    (payload?.cargo ? ADMIN_CARGOS.includes(payload.cargo.toUpperCase()) : false);

  const motivoAdmin =
    (typeof billing?.message === "string" && billing.message.trim() ? billing.message : null) ||
    payload?.motivo ||
    "Pendencia detectada. Regularize para liberar o acesso.";

  const msgFuncionario = useMemo(() => {
    return `Seu acesso esta temporariamente indisponivel.\n\nEntre em contato com o administrador da sua empresa (${nomeEmpresa}) para mais informacoes.`;
  }, [nomeEmpresa]);

  const isBlocked = Boolean(data?.billing?.blocked) || data?.ok === false;

  const mensagemSuporte = `Olá! Preciso de suporte com meu acesso no WorkID.\nEmpresa: ${nomeEmpresa}\nE-mail: ${payload?.email || ""}`;
  const whatsappSuporte = suporteBaseUrl
    ? `${suporteBaseUrl}?text=${encodeURIComponent(mensagemSuporte)}`
    : null;

  const abrirSuporteWhatsApp = () => {
    if (whatsappSuporte) {
      openInNewTab(whatsappSuporte);
      return;
    }
    // Config ainda não carregou: abre placeholder síncrono e redireciona quando responder.
    const w = window.open("about:blank", "_blank");
    fetch("/api/me/contato-suporte")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ativo && d?.link && w) {
          const base = String(d.link).split("?")[0];
          w.location.href = `${base}?text=${encodeURIComponent(mensagemSuporte)}`;
        } else if (w) {
          w.close();
        }
      })
      .catch(() => {
        if (w) w.close();
      });
  };

  return (
    <>
      <div className="min-h-screen bg-page flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 shadow-2xl shadow-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-text-primary text-xl">Acesso temporariamente indisponivel</CardTitle>
            <CardDescription className="text-gray-400">Empresa: {nomeEmpresa}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-gray-300">
            {/* ====== ADMIN: mostra motivo ====== */}
            {isAdmin && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm">
                <p className="font-semibold text-text-primary text-xs uppercase tracking-wider mb-1">Motivo do bloqueio</p>
                <p className="text-gray-300">{motivoAdmin}</p>
              </div>
            )}

            {/* ====== FUNCIONARIO: mensagem neutra ====== */}
            {!isAdmin && (
              <div className="rounded-xl border border-border-default bg-hover-bg p-4 text-sm text-gray-200">
                <p className="text-gray-200 whitespace-pre-line">{msgFuncionario}</p>
              </div>
            )}

            {/* ====== ACOES ADMIN ====== */}
            {isBlocked && isAdmin && (
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={abrirPagamento}
                  disabled={payLoading}
                  className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all"
                >
                  {payLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Carregando fatura...
                    </span>
                  ) : (
                    "Pagar agora"
                  )}
                </Button>

                <Button
                  type="button"
                  className="w-full h-11 text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20 rounded-xl transition-all"
                  onClick={abrirSuporteWhatsApp}
                >
                  Para falar com suporte via WhatsApp
                </Button>

                {payError && (
                  <p className="text-center text-xs text-red-400 bg-red-500/10 rounded-lg p-2">{payError}</p>
                )}
              </div>
            )}

            {/* Status */}
            <p className="text-center text-xs text-gray-500">
              {autoMsg
                ? autoMsg
                : checking
                ? "Verificando acesso..."
                : "Verificacao automatica a cada 10s. Acesso liberado = redirecionamento automatico."}
            </p>

            <Button
              type="button"
              className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl"
              onClick={async () => {
                try {
                  localStorage.removeItem("workid_rt");
                  sessionStorage.removeItem(STORAGE_KEY);
                } catch {
                  // ignore
                }
                await signOut({ redirect: false });
                window.location.href = "/login";
              }}
            >
              Voltar ao login
            </Button>

            {/* Funcionario: copiar mensagem */}
            {!isAdmin && (
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-xl"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(msgFuncionario);
                    setAutoMsg("Mensagem copiada!");
                    window.setTimeout(() => setAutoMsg(null), 2500);
                  } catch {
                    setAutoMsg("Nao consegui copiar automaticamente.");
                    window.setTimeout(() => setAutoMsg(null), 2500);
                  }
                }}
              >
                Copiar mensagem
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PaymentModal integrado */}
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        asaas={asaasBundle}
        loading={payLoading}
        onRefresh={refreshFatura}
        onGenerate={recriarCobranca}
        msg={payMsg}
        setMsg={setPayMsg}
      />
    </>
  );
}
