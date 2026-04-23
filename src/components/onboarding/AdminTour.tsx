"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { driver, DriveStep, Driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_VERSION = "v2";
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
        title: "Bem-vindo ao novo painel!",
        description:
          "O painel foi reorganizado para crescer junto com sua empresa. Vou te mostrar onde tudo fica agora.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-title"]',
      popover: {
        title: "Sua empresa",
        description: "Nome da empresa ou unidade que você está gerenciando.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-store-selector"]',
      popover: {
        title: "Trocar unidade",
        description: "Tem mais de uma filial? Troque por aqui para ver os dados de cada uma.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-sidebar"]',
      popover: {
        title: "Menu lateral",
        description: "Toda a navegação agora está aqui, organizada por categorias. Pode ser recolhida no botão no rodapé.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="sidebar-team"]',
      popover: {
        title: "Gestão da Equipe",
        description: "Cadastre funcionários, defina jornadas, controle acessos e configure o local do ponto de cada um.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="sidebar-ajustes"]',
      popover: {
        title: "Ajustes de Ponto",
        description: "Aprove ou rejeite solicitações de ajuste/inclusão. O número em vermelho mostra quantas estão pendentes.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="sidebar-atestados"]',
      popover: {
        title: "Atestados",
        description: "Aprove atestados médicos e justificativas enviadas pelos funcionários.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="sidebar-comunicados"]',
      popover: {
        title: "Comunicados",
        description: "Envie avisos para a equipe inteira ou para funcionários específicos. Os funcionários veem no app.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="sidebar-contracheques"]',
      popover: {
        title: "Contracheques",
        description: "Envie holerites em PDF para os funcionários assinarem digitalmente. A assinatura é inserida no próprio documento.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="sidebar-auditoria"]',
      popover: {
        title: "Auditoria",
        description: "Histórico completo de tudo que foi alterado no sistema e por quem.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="sidebar-configuracoes"]',
      popover: {
        title: "Configurações da empresa",
        description:
          "Aqui você define as regras: bloqueio de GPS, foto obrigatória, tolerância de atraso, limite de horas extras, lembretes e muito mais.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-ausencia"]',
      popover: {
        title: "Lançar ausência rápida",
        description: "Botão para registrar férias, folgas ou faltas direto pelo painel.",
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
        description: "Defina a data de início e fim para o relatório aparecer abaixo.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="admin-report"]',
      popover: {
        title: "Gerar relatório",
        description: "Exporte a folha de ponto em PDF ou Excel, pronto para enviar ao contador.",
        side: "bottom",
        align: "start",
      },
    },
  ];

  return all.filter((step) => {
    const el = step.element;
    if (!el || typeof el !== "string" || el === "body") return true;
    const node = document.querySelector(el) as HTMLElement | null;
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
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
