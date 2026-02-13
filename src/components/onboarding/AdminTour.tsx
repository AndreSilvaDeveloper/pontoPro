"use client";

import { useEffect, useMemo, useRef } from "react";
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

// flag de sessão para impedir start duplicado
const STARTED_SESSION_KEY = "ui:admin-tour-started:v1";

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

  // ✅ Só mantém steps cujo elemento existe no DOM
  return all.filter((step) => {
    const el = step.element;
    if (!el) return true;
    if (typeof el !== "string") return true;
    return !!document.querySelector(el);
  });
}

export default function AdminTour() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // evita dependência instável do objeto searchParams
  const forced = useMemo(
    () => searchParams?.get("tour") === "1",
    [searchParams]
  );

  const driverRef = useRef<Driver | null>(null);
  const didStartRef = useRef(false);
  const markingCompleteRef = useRef(false);

  useEffect(() => {
    // ✅ Rota: /admin ou /admin/
    const isAdminHome = pathname === "/admin" || pathname === "/admin/";
    if (!isAdminHome) return;

    // ✅ só roda quando a sessão estiver pronta
    if (status !== "authenticated") return;

    // opcional: não quer tutorial pro SUPER_ADMIN
    const cargo = (session?.user as any)?.cargo;
    if (cargo === "SUPER_ADMIN") return;

    const userId = (session?.user as any)?.id ?? null;
    const empresaId = (session?.user as any)?.empresaId ?? null;
    const TOUR_KEY = makeAdminTourKey(empresaId, userId);

    const done = localStorage.getItem(TOUR_KEY) === "1";
    if (done && !forced) return;

    // se já iniciou nessa sessão, não inicia de novo
    if (!forced && sessionStorage.getItem(STARTED_SESSION_KEY) === "1") return;

    const destroyDriverSilently = () => {
      // destrói sem marcar como concluído
      markingCompleteRef.current = false;
      try {
        driverRef.current?.destroy();
      } catch {}
      driverRef.current = null;
    };

    const startTour = () => {
      if (didStartRef.current && !forced) return;
      didStartRef.current = true;

      if (!forced) sessionStorage.setItem(STARTED_SESSION_KEY, "1");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // ✅ NÃO inicia se o modal de billing ainda está aberto no DOM
          if (!forced && document.querySelector('[data-billing-modal="open"]'))
            return;

          const steps = getSteps();
          if (!steps.length) return;

          destroyDriverSilently();

          const d = driver({
            showProgress: true,
            allowClose: false,
            nextBtnText: "Próximo",
            prevBtnText: "Voltar",
            doneBtnText: "Concluir",
            steps,
            onDestroyed: () => {
              if (markingCompleteRef.current) {
                localStorage.setItem(TOUR_KEY, "1");
              }
              markingCompleteRef.current = false;
            },
          });

          driverRef.current = d;

          // intenção de concluir (o fluxo normal termina com destroy)
          markingCompleteRef.current = true;

          d.drive();
        });
      });
    };

    // ✅ Se billing já foi fechado, inicia
    const billingClosed = localStorage.getItem(BILLING_KEY) === "1";
    if (billingClosed || forced) {
      const t = window.setTimeout(startTour, 300);
      return () => {
        window.clearTimeout(t);
        destroyDriverSilently();
      };
    }

    // ✅ Listener do evento (inicia só quando o billing realmente fechou)
    const handler = () => {
      // não seta BILLING_KEY aqui: quem fecha o modal seta
      startTour();
    };
    window.addEventListener(BILLING_EVENT, handler, { once: true });

    // ✅ fallback (mantido): polling curto caso o evento falhe em alguns mobiles
    const poll = window.setInterval(() => {
      if (!forced && sessionStorage.getItem(STARTED_SESSION_KEY) === "1") return;

      const closedNow = localStorage.getItem(BILLING_KEY) === "1";
      if (closedNow) {
        startTour();
        window.clearInterval(poll);
      }
    }, 300);

    const stop = window.setTimeout(() => window.clearInterval(poll), 8000);

    return () => {
      window.removeEventListener(BILLING_EVENT, handler);
      window.clearInterval(poll);
      window.clearTimeout(stop);
      destroyDriverSilently();
    };
  }, [pathname, status, session, forced]);

  return null;
}
