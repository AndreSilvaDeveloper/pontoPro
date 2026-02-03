import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_VERSION = 'v1';
function makeAdminTourKey(empresaId: string | null, userId: string | null) {
  const e = empresaId ?? 'no_empresa';
  const u = userId ?? 'no_user';
  return `onboarding:admin:${TOUR_VERSION}:${e}:${u}`;
}

const BILLING_KEY = 'ui:billing-modal-closed:v1';
const BILLING_EVENT = 'billing-modal-closed';


function getSteps(): DriveStep[] {
  const all: DriveStep[] = [
    {
      element: 'body',
      popover: {
        title: 'Bem-vindo ao Painel Admin',
        description:
          'Vou te mostrar rapidamente onde ficam as principais funções do sistema.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="admin-title"]',
      popover: {
        title: 'Sua empresa',
        description:
          'Aqui você vê a empresa/unidade ativa e acessa o painel administrativo.',
          side: 'bottom',
          align: 'start', 
      },
    },
    {
      element: '[data-tour="admin-store-selector"]',
      popover: {
        title: 'Trocar unidade',
        description:
          'Use este seletor para alternar entre filiais ou unidades da empresa.',
          side: 'bottom',
           align: 'start',
      },
    },
    {
      element: '[data-tour="admin-team"]',
      popover: {
        title: 'Gestão da equipe',
        description:
          'Cadastre funcionários, gerencie dados e controle acessos.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-ausencia"]',
      popover: {
        title: 'Lançar ausência',
        description:
          'Aqui você lança ausências para os funcionários.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-ajustes"]',
      popover: {
        title: 'Ajustes e pendências',
        description:
          'Aqui você aprova ajustes de ponto e solicitações dos funcionários.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-atestados"]',
      popover: {
        title: 'Atestados',
        description:
          'Gerencie atestados e justificativas médicas.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-feriados"]',
      popover: {
        title: 'Feriados',
        description:
          'Importe os feriados e dias não úteis\npara o calculos de banco de horas.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-auditoria"]',
      popover: {
        title: 'Auditoria',
        description:
          'Acesse o histórico de alterações e auditoria do sistema.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-visao-geral"]',
      popover: {
        title: 'Visão Geral',
        description:
          'Aqui você vê um cenário de quais funcionários estão ativos e em quais unidades.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-filter-user"]',
      popover: {
        title: 'Filtro por funcionário',
        description:
          'Filtre os registros por funcionário específico.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-filter-period"]',
      popover: {
        title: 'Filtro por período',
        description:
          'Defina o intervalo de datas para visualizar os registros.',
          side: 'bottom',
          align: 'start',
      },
    },
    {
      element: '[data-tour="admin-report"]',
      popover: {
        title: 'Relatórios',
        description:
          'Gere relatórios em PDF ou Excel para conferência e auditoria.',
          side: 'bottom',
          align: 'start',
      },
    },
    
    {
      element: '[data-tour="admin-profile"]',
      popover: {
        title: 'Minha conta',
        description:
          'Acesse seus dados, plano, pagamentos e configurações.',
          side: 'bottom',
          align: 'start',
      },
    },
  ];

  // ✅ Só mantém steps cujo elemento existe no DOM
  return all.filter(
    (step) =>
      !step.element ||
      typeof step.element !== 'string' ||
      document.querySelector(step.element)
  );
}

export default function AdminTour() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { data: session, status } = useSession();

  useEffect(() => {

  // ✅ Rota mais flexível (pega /admin e /admin/)
  const isAdminHome = pathname === '/admin' || pathname === '/admin/';
  if (!isAdminHome) return;

    // ✅ só roda quando a sessão estiver pronta
  if (status !== 'authenticated') return;

  // opcional: se você não quer tutorial pro SUPER_ADMIN
  const cargo = (session?.user as any)?.cargo;
  if (cargo === 'SUPER_ADMIN') return;

  const userId = (session?.user as any)?.id ?? null;
  const empresaId = (session?.user as any)?.empresaId ?? null;
  const TOUR_KEY = makeAdminTourKey(empresaId, userId);

  const forced = search?.get('tour') === '1';
  const done = localStorage.getItem(TOUR_KEY) === '1';
  if (done && !forced) return;


  const start = () => {
    // ✅ garante que o DOM “assentou” (mobile precisa disso)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const steps = getSteps();
        if (!steps.length) return;

        const d = driver({
          showProgress: true,
          allowClose: false,
          nextBtnText: 'Próximo',
          prevBtnText: 'Voltar',
          doneBtnText: 'Concluir',
          steps,
          onDestroyed: () => {
            localStorage.setItem(TOUR_KEY, '1');
          },
        });

        d.drive();
      });
    });
  };

  // ✅ Se billing já foi fechado, inicia
  const billingClosed = localStorage.getItem(BILLING_KEY) === '1';
  if (billingClosed || forced) {
    setTimeout(start, 300);
    return;
  }

  // ✅ Listener do evento (normal)
  const handler = () => {
    localStorage.setItem(BILLING_KEY, '1');
    start();
  };
  window.addEventListener(BILLING_EVENT, handler, { once: true });

  // ✅ Fallback mobile: polling (caso o evento falhe)
  const startedFlagKey = 'ui:admin-tour-started:v1';
  const poll = setInterval(() => {
    // evita start duplicado
    if (sessionStorage.getItem(startedFlagKey) === '1') return;

    const closedNow = localStorage.getItem(BILLING_KEY) === '1';
    if (closedNow) {
      sessionStorage.setItem(startedFlagKey, '1');
      start();
      clearInterval(poll);
    }
  }, 300);

  // timebox de segurança (não fica rodando pra sempre)
  const stop = setTimeout(() => clearInterval(poll), 8000);

  return () => {
    window.removeEventListener(BILLING_EVENT, handler);
    clearInterval(poll);
    clearTimeout(stop);
    sessionStorage.removeItem(startedFlagKey);
  };
}, [pathname, search, session, status]);

  return null;
}
