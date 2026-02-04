import { Suspense } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">
          Carregando...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
