"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type DebugSessionResponse = {
  session?: {
    user?: {
      id?: string;
      name?: string;
      email?: string;
      cargo?: string;
      empresaId?: string | null;
      impersonatedBy?: string | null;
    };
  };
};

export function ImpersonationBanner() {
  const [loading, setLoading] = useState(true);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);
  const [asUserName, setAsUserName] = useState<string>("");
  const [asUserEmail, setAsUserEmail] = useState<string>("");
  const [asUserCargo, setAsUserCargo] = useState<string>("");

  const fetchDebug = async () => {
    setLoading(true);
    try {
      const res = await axios.get<DebugSessionResponse>("/api/debug-session");
      const u = res.data?.session?.user;
      const imp = (u as any)?.impersonatedBy || null;

      setImpersonatedBy(imp);
      setAsUserName(String(u?.name || ""));
      setAsUserEmail(String(u?.email || ""));
      setAsUserCargo(String((u as any)?.cargo || ""));
    } catch (e) {
      setImpersonatedBy(null);
      setAsUserName("");
      setAsUserEmail("");
      setAsUserCargo("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebug();
    // revalida de tempos em tempos (se trocar aba/rota)
    const t = setInterval(fetchDebug, 15000);
    return () => clearInterval(t);
  }, []);

  const stop = async () => {
    try {
      await axios.post("/api/admin/impersonate/stop");
      // força refresh para garantir sessão/telas atualizadas
      window.location.href = "/saas";
    } catch (e) {
      alert("Não foi possível voltar para SUPER_ADMIN.");
    }
  };

  if (loading) return null;
  if (!impersonatedBy) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div className="w-full bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-700 text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold tracking-wide">
              🟣 MODO SUPORTE ATIVO
            </div>
            <div className="text-[11px] sm:text-xs text-white/90 truncate">
              Você está como:{" "}
              <span className="font-semibold">
                {asUserName || "Usuário"}
              </span>
              {asUserEmail ? (
                <>
                  {" "}
                  <span className="text-white/80">({asUserEmail})</span>
                </>
              ) : null}
              {asUserCargo ? (
                <>
                  {" "}
                  <span className="text-white/80">• {asUserCargo}</span>
                </>
              ) : null}
            </div>
          </div>

          <button
            onClick={stop}
            className="shrink-0 px-3 py-2 rounded-lg bg-black/25 hover:bg-black/35 border border-white/20 text-xs sm:text-sm font-bold"
            title="Voltar para SUPER_ADMIN"
          >
            Voltar para SUPER_ADMIN
          </button>
        </div>
      </div>

      {/* espaçador para não cobrir o conteúdo */}
      <div className="h-[44px] sm:h-[52px]" />
    </div>
  );
}