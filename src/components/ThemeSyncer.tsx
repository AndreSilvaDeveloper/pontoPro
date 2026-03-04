'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';

/** Ao logar, carrega o tema salvo no banco e aplica. */
export default function ThemeSyncer() {
  const { data: session } = useSession();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/user/tema')
      .then((r) => r.json())
      .then((d) => {
        if (d.tema) setTheme(d.tema);
      })
      .catch(() => {});
  }, [session?.user, setTheme]);

  return null;
}
