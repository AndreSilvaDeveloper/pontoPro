import { Suspense } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page flex items-center justify-center text-text-muted">
          Carregando...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
