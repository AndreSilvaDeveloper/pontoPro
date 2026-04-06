'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Componente que restaura a sessão automaticamente no iOS PWA
 * quando o cookie de session é perdido ao fechar o app.
 * Usa um refresh token salvo no localStorage.
 */
export default function AutoLoginRestore() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Só tenta restaurar se não está autenticado e está numa página pública/login
    if (status !== 'unauthenticated') return;

    // Não restaurar em páginas públicas (landing, blog, signup)
    const publicPages = ['/', '/landing', '/blog', '/signup', '/termos', '/privacidade', '/agendar-demo'];
    if (publicPages.some(p => pathname === p || pathname?.startsWith('/blog/'))) return;

    const refreshToken = localStorage.getItem('workid_rt');
    if (!refreshToken) return;

    // Tentar restaurar sessão
    fetch('/api/auth/auto-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          // Session restaurada — recarregar para que o NextAuth leia o novo cookie
          window.location.reload();
        } else {
          // Token inválido — limpar
          localStorage.removeItem('workid_rt');
        }
      })
      .catch(() => {});
  }, [status, pathname, router]);

  return null;
}
