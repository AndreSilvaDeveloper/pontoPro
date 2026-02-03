import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { driver, DriveStep, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_VERSION = 'v1';

function makeFuncionarioTourKey(empresaId: string | null, userId: string | null) {
  const e = empresaId ?? 'no_empresa';
  const u = userId ?? 'no_user';
  return `onboarding:funcionario:${TOUR_VERSION}:${e}:${u}`;
}


function getAllSteps(): DriveStep[] {
  return [
    {
      element: 'body',
      popover: {
        title: 'Bem-vindo!',
        description: 'Vou te mostrar rapidinho como bater o ponto e onde ver suas informações.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="emp-header"]',
      popover: {
        title: 'Seu painel',
        description: 'Aqui aparece seu nome e o horário atual.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="emp-gps"]',
      popover: {
        title: 'Permitir GPS',
        description: 'Primeiro passo: permita a localização para validar o ponto.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="emp-actions"]',
      popover: {
        title: 'Bater ponto',
        description: 'Depois do GPS, estes botões aparecem para registrar entrada/pausas/saída.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="emp-camera"]',
      popover: {
        title: 'Reconhecimento por foto',
        description: 'Se a empresa exigir foto, ela aparece aqui para validar o ponto.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="emp-forgot"]',
      popover: {
        title: 'Esqueci de bater o ponto',
        description: 'Solicite inclusão de registro e o admin aprova.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="emp-sign"]',
      popover: {
        title: 'Assinatura eletrônica',
        description: 'Crie sua assinatura para validar registros.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="emp-justify"]',
      popover: {
        title: 'Justificativas',
        description: 'Justifique ausências e envie arquivos comprovantes.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="emp-history"]',
      popover: {
        title: 'Histórico',
        description: 'Veja registros, solicitações e acompanhamentos.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="emp-logout"]',
      popover: {
        title: 'Sair',
        description: 'Finalize sua sessão por aqui.',
        side: 'left',
        align: 'center',
      },
    },
  ];
}

function exists(sel?: string) {
  if (!sel) return true;
  if (sel === 'body') return true;
  try {
    return !!document.querySelector(sel);
  } catch {
    return false;
  }
}

// pula steps que não existem no momento
function nextExistingIndex(steps: DriveStep[], fromIndex: number) {
  for (let i = fromIndex; i < steps.length; i++) {
    const el = steps[i]?.element;
    if (typeof el !== 'string') return i;
    if (exists(el)) return i;
  }
  return -1;
}

export default function FuncionarioTour() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { data: session, status } = useSession();

  useEffect(() => {
    const isFuncHome = pathname === '/funcionario' || pathname === '/funcionario/';
    if (!isFuncHome) return;

   
    if (status !== 'authenticated') return;

    const userId = (session?.user as any)?.id ?? null;
    const empresaId = (session?.user as any)?.empresaId ?? null;

    const TOUR_KEY = makeFuncionarioTourKey(empresaId, userId);

    const forced = search?.get('tour') === '1';
    const done = localStorage.getItem(TOUR_KEY) === '1';
    if (done && !forced) return;



    // aguarda DOM estável
    const boot = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const all = getAllSteps();

          // mantém a ordem, mas não elimina tudo de cara
          // (o GPS/câmera podem aparecer depois)
          const d: Driver = driver({
            showProgress: true,
            allowClose: false,
            nextBtnText: 'Próximo',
            prevBtnText: 'Voltar',
            doneBtnText: 'Concluir',
            steps: all,

            onDestroyed: () => {
              localStorage.setItem(TOUR_KEY, '1');
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
              if (typeof el !== 'string' || exists(el)) {
                d.moveTo(i);
                return;
              }
            }

            d.moveTo(0);
          },
          }); 

          // começa no primeiro step que existe
          const first = nextExistingIndex(all, 0);
          if (first === -1) return;
          d.drive(first);
        });
      });
    };

    setTimeout(boot, 250);
    }, [pathname, search, session, status]);


  return null;
}
