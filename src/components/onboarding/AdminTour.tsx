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

export const ADMIN_TOUR_RESTART_EVENT = "admin-tour-restart";

function getSteps(): DriveStep[] {
  const all: DriveStep[] = [
    {
      element: "body",
      popover: {
        title: "Bem-vindo ao Painel Admin",
        description:
          "Vou te mostrar onde ficam as principais funções. Use o botão Tutorial para rever este guia quando quiser.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-title"]',
      popover: {
        title: "Sua empresa",
        description:
          "Nome da empresa ou unidade que você está gerenciando agora.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-store-selector"]',
      popover: {
        title: "Trocar unidade",
        description:
          "Se tiver mais de uma filial, troque por aqui para ver os dados de cada uma.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-team"]',
      popover: {
        title: "Gestão da equipe",
        description: "Cadastre e edite funcionários, defina escalas e controle acessos.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-ausencia"]',
      popover: {
        title: "Lançar ausência",
        description: "Registre férias, folgas ou faltas dos funcionários.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-ajustes"]',
      popover: {
        title: "Ajustes de ponto",
        description:
          "Veja e aprove solicitações de ajuste feitas pelos funcionários.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-atestados"]',
      popover: {
        title: "Atestados",
        description: "Veja atestados e justificativas enviadas pelos funcionários.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-feriados"]',
      popover: {
        title: "Feriados",
        description:
          "Cadastre feriados e dias não úteis para o cálculo correto do banco de horas.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-auditoria"]',
      popover: {
        title: "Auditoria",
        description: "Veja tudo que foi alterado no sistema e por quem.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-visao-geral"]',
      popover: {
        title: "Visão Geral",
        description:
          "Veja um resumo de presença, faltas, atrasos e alertas de toda a equipe.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-filter-user"]',
      popover: {
        title: "Filtrar por funcionário",
        description: "Escolha um funcionário para ver só os registros dele.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-filter-period"]',
      popover: {
        title: "Filtrar por período",
        description:
          "Escolha as datas de início e fim para ver os registros desse período.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-report"]',
      popover: {
        title: "Gerar relatório",
        description:
          "Exporte a folha de ponto em PDF ou Excel, pronto para enviar ao contador.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-profile"]',
      popover: {
        title: "Minha conta",
        description: "Veja seus dados, plano, pagamentos e configurações.",
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

/** Dispara evento tour-done e seta flag no window */
function fireTourDone() {
  (window as any).__tourDone = true;
  window.dispatchEvent(new Event('tour-done'));
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
      fireTourDone();
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

  // ========== TOUR AUTOMÁTICO (PRIMEIRO a aparecer) ==========
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

    // Se já viu o tour, dispara tour-done direto para liberar os banners
    if (done && !forced) {
      fireTourDone();
      return;
    }

    const launchTour = () => {
      destroyDriver();
      const steps = getSteps();
      if (!steps.length) {
        fireTourDone();
        return;
      }
      const d = createDriver(steps, TOUR_KEY);
      driverRef.current = d;
      d.drive();
    };

    const iniciarQuandoPronto = () => {
      timerRef.current = setTimeout(launchTour, forced ? 300 : 1000);
    };

    // Esperar billing-alert-done antes de iniciar o tour — sem fallback
    const w = window as any;
    if (w.__billingDone) {
      iniciarQuandoPronto();
    } else {
      const onBillingDone = () => {
        window.removeEventListener('billing-alert-done', onBillingDone);
        iniciarQuandoPronto();
      };
      window.addEventListener('billing-alert-done', onBillingDone);

      return () => {
        window.removeEventListener('billing-alert-done', onBillingDone);
        destroyDriver();
      };
    }

    return () => destroyDriver();
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
