'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/components/funcionario/BottomNav';
import NotificacaoSolicitacao from '@/components/funcionario/NotificacaoSolicitacao';

export default function FuncionarioLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || onboardingChecked) return;

    // Fetch direto do servidor — única fonte de verdade
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(s => {
        const user = s?.user;
        if (!user) return;

        // Impersonate ou SUPER_ADMIN: libera direto
        if (user.impersonatedBy || user.cargo === 'SUPER_ADMIN') {
          setAllowed(true);
          setOnboardingChecked(true);
          return;
        }

        // Onboarding sequencial — redireciona para a primeira pendência
        if (s.error === 'BILLING_BLOCK') {
          router.replace('/acesso_bloqueado');
        } else if (user.deveTrocarSenha) {
          router.replace('/trocar-senha');
        } else if (!user.temAssinatura) {
          router.replace('/cadastrar-assinatura');
        } else if (user.deveCadastrarFoto) {
          router.replace('/cadastrar-foto');
        } else if (user.deveDarCienciaCelular) {
          router.replace('/ciencia-celular');
        } else {
          setAllowed(true);
        }
        setOnboardingChecked(true);
      })
      .catch(() => {
        setAllowed(true);
        setOnboardingChecked(true);
      });
  }, [status, onboardingChecked, router]);

  if (status === 'loading' || !onboardingChecked) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <NotificacaoSolicitacao />
      {children}
      <BottomNav />
    </>
  );
}
