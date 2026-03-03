"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { driver, DriveStep, Driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_VERSION = "v1";
function makeAdminTourKey(empresaId: string | null, userId: string | null) {
  const e = empresaId ?? "no_empresa";
  const u = userId ?? "no_user";
  return `onboarding:admin:${TOUR_VERSION}:${e}:${u}`;
}

const BILLING_KEY = "ui:billing-modal-closed:v1";
const BILLING_EVENT = "billing-modal-closed";

export const ADMIN_TOUR_RESTART_EVENT = "admin-tour-restart";

function getSteps(): DriveStep[] {
  const all: DriveStep[] = [
    {
      element: "body",
      popover: {
        title: "Bem-vindo ao Painel Admin",
        description:
          "Vou te mostrar rapidamente onde ficam as principais funções do sistema.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-title"]',
      popover: {
        title: "Sua empresa",
        description:
          "Aqui você vê a empresa/unidade ativa e acessa o painel administrativo.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-store-selector"]',
      popover: {
        title: "Trocar unidade",
        description:
          "Use este seletor para alternar entre filiais ou unidades da empresa.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-team"]',
      popover: {
        title: "Gestão da equipe",
        description: "Cadastre funcionários, gerencie dados e controle acessos.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-ausencia"]',
      popover: {
        title: "Lançar ausência",
        description: "Aqui você lança ausências para os funcionários.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-ajustes"]',
      popover: {
        title: "Ajustes e pendências",
        description:
          "Aqui você aprova ajustes de ponto e solicitações dos funcionários.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-atestados"]',
      popover: {
        title: "Atestados",
        description: "Gerencie atestados e justificativas médicas.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-feriados"]',
      popover: {
        title: "Feriados",
        description:
          "Importe os feriados e dias não úteis\npara o calculo de banco de horas.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-auditoria"]',
      popover: {
        title: "Auditoria",
        description: "Acesse o histórico de alterações e auditoria do sistema.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-visao-geral"]',
      popover: {
        title: "Visão Geral",
        description:
          "Aqui você vê um cenário de quais funcionários estão ativos e em quais unidades.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-filter-user"]',
      popover: {
        title: "Filtro por funcionário",
        description: "Filtre os registros por funcionário específico.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-filter-period"]',
      popover: {
        title: "Filtro por período",
        description:
          "Defina o intervalo de datas para visualizar os registros.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-report"]',
      popover: {
        title: "Relatórios",
        description:
          "Gere relatórios em PDF ou Excel para conferência e auditoria.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-profile"]',
      popover: {
        title: "Minha conta",
        description: "Acesse seus dados, plano, pagamentos e configurações.",
        side: "bottom",
        align: "start",
      },
    },
  ];

  return all.filter((step) => {
    const el = step.element;
    if (!el || typeof el !== "string") return true;
    return !!document.querySelector(el);
  });
}

/** Verifica se o billing modal está aberto no DOM */
function isBillingModalOpen() {
  return !!document.querySelector('[data-billing-modal="open"]');
}

/** Verifica se o toast de notificação está visível */
function isToastVisible() {
  // O toast tem z-[100] e fica em fixed top-16 right-6
  return !!document.querySelector('[data-tour="admin-ajustes"].fixed');
}

function createDriver(steps: DriveStep[], tourKey: string): Driver {
  const d = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: "Próximo",
    prevBtnText: "Voltar",
    doneBtnText: "Concluir",
    popoverClass: "tour-popover",
    steps,
    onCloseClick: () => {
      localStorage.setItem(tourKey, "1");
      d.destroy();
    },
    onDestroyed: () => {
      localStorage.setItem(tourKey, "1");
    },
  });
  return d;
}

export default function AdminTour() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const driverRef = useRef<Driver | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destroyDriver = () => {
    try { driverRef.current?.destroy(); } catch {}
    driverRef.current = null;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  // ========== TOUR AUTOMÁTICO (primeiro acesso) ==========
  useEffect(() => {
    const isAdminHome = pathname === "/admin" || pathname === "/admin/";
    if (!isAdminHome || status !== "authenticated") return;

    const cargo = (session?.user as any)?.cargo;
    if (cargo === "SUPER_ADMIN") return;

    const forced = searchParams?.get("tour") === "1";
    const userId = (session?.user as any)?.id ?? null;
    const empresaId = (session?.user as any)?.empresaId ?? null;
    const TOUR_KEY = makeAdminTourKey(empresaId, userId);

    const done = localStorage.getItem(TOUR_KEY) === "1";
    if (done && !forced) return;

    const launchTour = () => {
      destroyDriver();
      const steps = getSteps();
      if (!steps.length) return;
      const d = createDriver(steps, TOUR_KEY);
      driverRef.current = d;
      d.drive();
    };

    /**
     * Tenta iniciar o tour. Se algo estiver bloqueando (billing modal ou toast),
     * reagenda. Máximo de tentativas para não ficar em loop infinito.
     */
    let attempts = 0;
    const tryStart = () => {
      attempts++;
      if (attempts > 30) return; // desiste após ~30s

      // Billing modal aberto? Espera evento ou re-poll
      if (!forced && isBillingModalOpen()) {
        timerRef.current = setTimeout(tryStart, 1000);
        return;
      }

      // Toast de notificação visível? Espera sumir
      const notifEl = document.querySelector('.fixed.top-16.right-6');
      if (notifEl) {
        timerRef.current = setTimeout(tryStart, 1000);
        return;
      }

      launchTour();
    };

    // Delay inicial para o DOM estabilizar
    timerRef.current = setTimeout(tryStart, forced ? 300 : 800);

    // Também escuta o evento de billing fechar (caso esteja esperando)
    const onBillingClosed = () => {
      // Pequeno delay após billing fechar
      timerRef.current = setTimeout(tryStart, 500);
    };
    window.addEventListener(BILLING_EVENT, onBillingClosed);

    return () => {
      window.removeEventListener(BILLING_EVENT, onBillingClosed);
      destroyDriver();
    };
  }, [pathname, status, session, searchParams]);

  // ========== RESTART MANUAL (botão "Ver Tutorial") ==========
  useEffect(() => {
    const isAdminHome = pathname === "/admin" || pathname === "/admin/";
    if (!isAdminHome || status !== "authenticated") return;

    const userId = (session?.user as any)?.id ?? null;
    const empresaId = (session?.user as any)?.empresaId ?? null;
    const TOUR_KEY = makeAdminTourKey(empresaId, userId);

    const handleRestart = () => {
      destroyDriver();
      localStorage.removeItem(TOUR_KEY);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const steps = getSteps();
          if (!steps.length) return;
          const d = createDriver(steps, TOUR_KEY);
          driverRef.current = d;
          d.drive();
        });
      });
    };

    window.addEventListener(ADMIN_TOUR_RESTART_EVENT, handleRestart);
    return () => {
      window.removeEventListener(ADMIN_TOUR_RESTART_EVENT, handleRestart);
    };
  }, [pathname, status, session]);

  return null;
}
