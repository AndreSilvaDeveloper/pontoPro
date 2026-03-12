import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Provider from "@/providers/SessionProvider";
import ThemeProvider from "@/providers/ThemeProvider";
import { Suspense } from "react";
import ThemedToaster from "@/components/ThemedToaster";
import ThemeSyncer from "@/components/ThemeSyncer";
import OnboardingMount from "@/components/onboarding/OnboardingMount";
import { ImpersonationRoot } from "@/components/impersonation/ImpersonationRoot";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";


const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  viewportFit: 'cover',
};

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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <Provider>
            <ThemeSyncer />
            <ServiceWorkerRegistrar />
            <Suspense fallback={null}>
              <OnboardingMount />
            </Suspense>

            {children}

            <ThemedToaster />
             <ImpersonationRoot />

          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
