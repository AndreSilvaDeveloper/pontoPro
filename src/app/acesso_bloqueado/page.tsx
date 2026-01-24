'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { base64UrlDecodeUtf8 } from "@/lib/base64url";

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

export default function BloqueadoPage() {
  const [data, setData] = useState<any>(null);
  const [payload, setPayload] = useState<BlockPayload | null>(null);

  useEffect(() => {
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

    // 2) tenta buscar status (se tiver sessão)
    fetch("/api/empresa/billing-status")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setData({ ok: false }));
  }, []);

  const empresa = data?.empresa;
  const billing = data?.billing;

  const nomeEmpresa = empresa?.nome || payload?.empresaNome || "Empresa";
  const motivo =
    billing?.message ||
    payload?.motivo ||
    "Pendência financeira ou teste expirado.";

  const pixKey = empresa?.chavePix || payload?.pixKey || null;
  const whatsapp = (empresa?.cobrancaWhatsapp || payload?.whatsapp || "5532991473554")?.replace(/\D/g, '');

  const whatsappMsg = useMemo(() => {
    const base = `Olá! Preciso regularizar meu acesso no WorkID.\nEmpresa: ${nomeEmpresa}\nMotivo: ${motivo}\nE-mail: ${payload?.email || ""}\n\nVou enviar o comprovante aqui.`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(base)}`;
  }, [whatsapp, nomeEmpresa, motivo, payload?.email]);

  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md border-purple-500/20 bg-gradient-to-b from-[#0f1535]/95 to-[#0a0e27]/95 shadow-2xl shadow-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Acesso suspenso</CardTitle>
          <CardDescription className="text-gray-400">
            Empresa: {nomeEmpresa}
          </CardDescription>
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

          <div className="flex gap-2">
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <Link href="/login">Voltar</Link>
            </Button>

            <Button asChild variant="outline" className="w-full border-purple-500/20 text-gray-200 hover:bg-purple-950/30">
              <a href={whatsappMsg} target="_blank" rel="noreferrer">Enviar comprovante</a>
            </Button>
          </div>

          {/* Se houver sessão ativa, deixar um atalho pra fatura */}
          {data?.ok && (
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Link href="/admin/perfil?pay=1">Realizar pagamento</Link>
            </Button>
          )}

          <p className="text-center text-xs text-gray-500">
            Se você já pagou, envie o comprovante no WhatsApp para baixa manual.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
