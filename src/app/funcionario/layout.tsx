'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BottomNav from '@/components/funcionario/BottomNav';
import NotificacaoSolicitacao from '@/components/funcionario/NotificacaoSolicitacao';

export default function FuncionarioLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;

    // SUPER_ADMIN ou impersonate pula todas as verificações de onboarding
    // @ts-ignore
    if (session?.user?.cargo === 'SUPER_ADMIN' || session?.user?.impersonatedBy) return;

    // Bloqueio financeiro
    if ((session as any)?.error === 'BILLING_BLOCK') {
      router.push('/acesso_bloqueado');
      return;
    }

    if (session?.user?.deveTrocarSenha) {
      router.push('/trocar-senha');
      return;
    }

    if (!session?.user?.temAssinatura) {
      router.push('/cadastrar-assinatura');
      return;
    }

    if (session?.user?.deveCadastrarFoto) {
      router.push('/cadastrar-foto');
      return;
    }

    if (session?.user?.deveDarCienciaCelular) {
      router.push('/ciencia-celular');
      return;
    }
  }, [status, session, router]);

  return (
    <>
      <NotificacaoSolicitacao />
      {children}
      <BottomNav />
    </>
  );
}
