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

    if (forced) {
      timerRef.current = setTimeout(launchTour, 300);
      return () => destroyDriver();
    }

    // Espera todos os modais (billing, push, install, novidades) terminarem
    const onNovidadesDone = () => {
      // Ainda verifica billing modal
      if (isBillingModalOpen()) {
        window.addEventListener(BILLING_EVENT, () => {
          timerRef.current = setTimeout(launchTour, 500);
        }, { once: true });
        return;
      }
      timerRef.current = setTimeout(launchTour, 500);
    };

    window.addEventListener('novidades-done', onNovidadesDone);
    window.addEventListener(BILLING_EVENT, onNovidadesDone);

    // Fallback: checa a cada 2s se os modais sumiram (max 30s)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      // Se nenhum modal overlay está aberto, pode iniciar
      const hasModal = document.querySelector('.fixed.inset-0.z-\\[190\\]') ||
                       document.querySelector('.fixed.inset-0.z-\\[200\\]');
      const hasBilling = isBillingModalOpen();
      if (!hasModal && !hasBilling) {
        clearInterval(interval);
        timerRef.current = setTimeout(launchTour, 500);
      }
      if (attempts > 15) clearInterval(interval);
    }, 2000);

    return () => {
      window.removeEventListener('novidades-done', onNovidadesDone);
      window.removeEventListener(BILLING_EVENT, onNovidadesDone);
      clearInterval(interval);
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
