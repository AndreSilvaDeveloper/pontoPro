'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

const CYCLE: ('dark' | 'light' | 'system')[] = ['dark', 'light', 'system'];

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={`p-2.5 rounded-lg ${className}`} style={{ width: 38, height: 38 }} />;
  }

  const next = () => {
    const idx = CYCLE.indexOf(theme as any);
    const newTheme = CYCLE[(idx + 1) % CYCLE.length];
    setTheme(newTheme);

    // Salva no banco (fire-and-forget)
    fetch('/api/user/tema', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: newTheme }),
    }).catch(() => {});
  };

  const icon =
    theme === 'light' ? <Sun size={18} /> :
    theme === 'system' ? <Monitor size={18} /> :
    <Moon size={18} />;

  const label =
    theme === 'light' ? 'Tema Claro' :
    theme === 'system' ? 'Tema Automático' :
    'Tema Escuro';

  return (
    <button
      onClick={next}
      className={`p-2.5 hover:bg-hover-bg-strong rounded-lg text-text-muted hover:text-text-primary transition-colors ${className}`}
      title={label}
    >
      {icon}
    </button>
  );
}
