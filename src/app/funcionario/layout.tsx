'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BottomNav from '@/components/funcionario/BottomNav';

export default function FuncionarioLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;

    if (session?.user?.deveTrocarSenha) {
      router.push('/trocar-senha');
      return;
    }

    // @ts-ignore
    if (session?.user?.deveCadastrarFoto) {
      router.push('/cadastrar-foto');
      return;
    }
  }, [status, session, router]);

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
