'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import AdminTour from './AdminTour';
import FuncionarioTour from './FuncionarioTour';

function Inner() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) return <AdminTour />;
  if (pathname?.startsWith('/funcionario')) return <FuncionarioTour />;
  return null;
}

export default function OnboardingMount() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
