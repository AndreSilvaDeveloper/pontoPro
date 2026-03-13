"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { driver, DriveStep, Driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_VERSION = "v1";

export const FUNC_TOUR_RESTART_EVENT = "funcionario-tour-restart";

function makeFuncionarioTourKey(
  empresaId: string | null,
  userId: string | null
) {
  const e = empresaId ?? "no_empresa";
  const u = userId ?? "no_user";
  return `onboarding:funcionario:${TOUR_VERSION}:${e}:${u}`;
}

function getAllSteps(): DriveStep[] {
  return [
    {
      element: "body",
      popover: {
        title: "Bem-vindo!",
        description:
          "Vou te mostrar rapidinho como bater o ponto e usar o sistema.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="emp-header"]',
      popover: {
        title: "Seu painel",
        description: "Aqui aparece seu nome e o horário atual. Use o botão Tutorial para rever este guia quando quiser.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="emp-gps"]',
      popover: {
        title: "Ativar localização",
        description:
          "Toque aqui para permitir o GPS. Sem isso, não é possível bater o ponto.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="emp-actions"]',
      popover: {
        title: "Bater ponto",
        description:
          "Após ativar o GPS, os botões aparecem aqui. Toque para registrar entrada, pausas e saída.",
        side: "top",
        align: "start",
      },
    },
    {
      element: '[data-tour="emp-camera"]',
      popover: {
        title: "Foto para validação",
        description:
          "Se a empresa exigir, a câmera aparece aqui. Posicione seu rosto e confirme o ponto.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="emp-forgot"]',
      popover: {
        title: "Esqueceu de bater o ponto?",
        description: "Toque aqui para solicitar a inclusão do registro. Seu gestor vai aprovar ou recusar.",
        side: "top",
        align: "start",
      },
    },
    {
      element: '[data-tour="emp-logout"]',
      popover: {
        title: "Sair do sistema",
        description: "Toque aqui para encerrar sua sessão.",
        side: "left",
        align: "center",
      },
    },
  ];
}

function exists(sel?: string) {
  if (!sel) return true;
  if (sel === "body") return true;
  try {
    return !!document.querySelector(sel);
  } catch {
    return false;
  }
}

function nextExistingIndex(steps: DriveStep[], fromIndex: number) {
  for (let i = fromIndex; i < steps.length; i++) {
    const el = steps[i]?.element;
    if (typeof el !== "string") return i;
    if (exists(el)) return i;
  }
  return -1;
}

/** Dispara evento tour-done e seta flag no window */
function fireTourDone() {
  (window as any).__tourDone = true;
  window.dispatchEvent(new Event('tour-done'));
  // Funcionário não tem billing/ciência, libera prompts direto
  (window as any).__promptsReady = true;
  window.dispatchEvent(new Event('prompts-ready'));
}

function createTourDriver(all: DriveStep[], tourKey: string): Driver {
  const d: Driver = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: "Próximo",
    prevBtnText: "Voltar",
    doneBtnText: "Concluir",
    popoverClass: "tour-popover",
    steps: all,

    onCloseClick: () => {
      localStorage.setItem(tourKey, "1");
      d.destroy();
    },

    onDestroyed: () => {
      localStorage.setItem(tourKey, "1");
      fireTourDone();
    },

    onNextClick: () => {
      const idx = d.getActiveIndex() ?? 0;
      const nextIdx = nextExistingIndex(all, idx + 1);
      if (nextIdx === -1) {
        d.destroy();
        return;
      }
      d.moveTo(nextIdx);
    },

    onPrevClick: () => {
      const idx = d.getActiveIndex() ?? 0;
      for (let i = idx - 1; i >= 0; i--) {
        const el = all[i]?.element;
        if (typeof el !== "string" || exists(el)) {
          d.moveTo(i);
          return;
        }
      }
      d.moveTo(0);
    },
  });

  return d;
}

export default function FuncionarioTour() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { data: session, status } = useSession();

  const driverRef = useRef<Driver | null>(null);

  const destroyDriver = () => {
    try { driverRef.current?.destroy(); } catch {}
    driverRef.current = null;
  };

  // ========== TOUR AUTOMÁTICO (PRIMEIRO a aparecer) ==========
  useEffect(() => {
    const isFuncHome =
      pathname === "/funcionario" || pathname === "/funcionario/";
    if (!isFuncHome || status !== "authenticated") return;

    // @ts-ignore
    if (session?.user?.deveTrocarSenha) return;
    // @ts-ignore
    if (session?.user?.deveCadastrarFoto) return;

    const userId = (session?.user as any)?.id ?? null;
    const empresaId = (session?.user as any)?.empresaId ?? null;
    const TOUR_KEY = makeFuncionarioTourKey(empresaId, userId);

    const forced = search?.get("tour") === "1";
    const done = localStorage.getItem(TOUR_KEY) === "1";

    // Se já viu o tour, dispara tour-done direto para liberar os banners
    if (done && !forced) {
      fireTourDone();
      return;
    }

    const boot = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          destroyDriver();
          const all = getAllSteps();
          const d = createTourDriver(all, TOUR_KEY);
          driverRef.current = d;
          const first = nextExistingIndex(all, 0);
          if (first === -1) {
            fireTourDone();
            return;
          }
          d.drive(first);
        });
      });
    };

    // Inicia o tour após um pequeno delay para a página renderizar
    const t = setTimeout(boot, forced ? 300 : 1500);
    return () => { clearTimeout(t); destroyDriver(); };
  }, [pathname, search, session, status]);

  // ========== RESTART MANUAL ==========
  useEffect(() => {
    const isFuncHome =
      pathname === "/funcionario" || pathname === "/funcionario/";
    if (!isFuncHome || status !== "authenticated") return;

    const userId = (session?.user as any)?.id ?? null;
    const empresaId = (session?.user as any)?.empresaId ?? null;
    const TOUR_KEY = makeFuncionarioTourKey(empresaId, userId);

    const handleRestart = () => {
      destroyDriver();
      localStorage.removeItem(TOUR_KEY);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const all = getAllSteps();
          const d = createTourDriver(all, TOUR_KEY);
          driverRef.current = d;
          const first = nextExistingIndex(all, 0);
          if (first === -1) return;
          d.drive(first);
        });
      });
    };

    window.addEventListener(FUNC_TOUR_RESTART_EVENT, handleRestart);
    return () => {
      window.removeEventListener(FUNC_TOUR_RESTART_EVENT, handleRestart);
    };
  }, [pathname, status, session]);

  return null;
}
