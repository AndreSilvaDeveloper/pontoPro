"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ChevronUp, Minus } from "lucide-react";

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

const STORAGE_KEY = "imp-banner-minimized";

export function ImpersonationBanner() {
  const [loading, setLoading] = useState(true);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);
  const [asUserName, setAsUserName] = useState<string>("");
  const [asUserEmail, setAsUserEmail] = useState<string>("");
  const [asUserCargo, setAsUserCargo] = useState<string>("");
  const [minimized, setMinimized] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Restaura preferência de minimizado (persistida entre páginas/sessões)
  useEffect(() => {
    try {
      setMinimized(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

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
    const t = setInterval(fetchDebug, 15000);
    return () => clearInterval(t);
  }, []);

  // Empurra o conteúdo da página pra baixo só quando o banner expandido está visível.
  // (O "espaçador" antigo estava DENTRO do container fixed, então não empurrava nada.)
  useEffect(() => {
    const ativo = !!impersonatedBy && !minimized && !loading;
    if (!ativo) {
      document.body.style.paddingTop = "";
      return;
    }
    const update = () => {
      const h = bannerRef.current?.offsetHeight ?? 52;
      document.body.style.paddingTop = `${h}px`;
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      document.body.style.paddingTop = "";
    };
  }, [impersonatedBy, minimized, loading]);

  const toggleMinimized = (next: boolean) => {
    setMinimized(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
  };

  const stop = async () => {
    try {
      await axios.post("/api/admin/impersonate/stop");
      window.location.href = "/saas";
    } catch (e) {
      alert("Não foi possível voltar para SUPER_ADMIN.");
    }
  };

  if (loading) return null;
  if (!impersonatedBy) return null;

  // Pílula minimizada — canto inferior direito, não atrapalha navegação
  if (minimized) {
    return (
      <button
        onClick={() => toggleMinimized(false)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-700 to-indigo-700 px-3 py-2 text-white text-xs font-bold shadow-2xl border border-white/20 hover:scale-105 transition-transform"
        title="Modo suporte ativo — clique para expandir"
      >
        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
        Modo Suporte
        <ChevronUp size={14} />
      </button>
    );
  }

  return (
    <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-40">
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

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={stop}
              className="px-3 py-2 rounded-lg bg-black/25 hover:bg-black/35 border border-white/20 text-xs sm:text-sm font-bold"
              title="Voltar para SUPER_ADMIN"
            >
              Voltar para SUPER_ADMIN
            </button>
            <button
              onClick={() => toggleMinimized(true)}
              className="p-2 rounded-lg bg-black/25 hover:bg-black/35 border border-white/20"
              title="Minimizar banner"
              aria-label="Minimizar banner"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
