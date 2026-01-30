'use client';

import { usePathname } from 'next/navigation';
import AdminTour from './AdminTour';
import FuncionarioTour from './FuncionarioTour';

export default function OnboardingMount() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) return <AdminTour />;
  if (pathname?.startsWith('/funcionario')) return <FuncionarioTour />;

  return null;
}
