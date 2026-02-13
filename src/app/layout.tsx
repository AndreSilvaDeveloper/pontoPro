import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Provider from "@/providers/SessionProvider"; 
import { Suspense } from "react";
import { Toaster } from "sonner";
import OnboardingMount from "@/components/onboarding/OnboardingMount";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WorkID - Gestão Inteligente",
  description: "Sistema de Ponto com Biometria e Geolocalização",
  manifest: "/manifest.webmanifest",

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* Envolvemos tudo com o Provider */}
        <Provider>
          <Suspense fallback={null}>
            <OnboardingMount />
          </Suspense>

          {children}

          <Toaster position="top-right" richColors theme="dark" closeButton />
        </Provider>

      </body>
    </html>
  );
}