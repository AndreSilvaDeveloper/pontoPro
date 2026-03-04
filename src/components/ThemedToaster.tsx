'use client';

import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

export default function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-right"
      richColors
      theme={(resolvedTheme as 'light' | 'dark') ?? 'dark'}
      closeButton
    />
  );
}
