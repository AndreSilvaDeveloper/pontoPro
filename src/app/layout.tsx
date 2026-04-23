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
import AutoLoginRestore from "@/components/AutoLoginRestore";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { BASE_URL } from "@/config/site";


const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0e27',
};

export const metadata: Metadata = {
  title: {
    default: 'WorkID - Sistema de Ponto Digital com GPS e Reconhecimento Facial',
    template: '%s | WorkID',
  },
  description: 'Controle de ponto digital para empresas. Registro por GPS, reconhecimento facial, relatórios automáticos, banco de horas e espelho de ponto. Teste grátis 14 dias.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
  keywords: [
    'ponto digital', 'controle de ponto', 'ponto eletrônico', 'registro de ponto',
    'ponto por GPS', 'reconhecimento facial ponto', 'sistema de ponto', 'ponto online',
    'relógio de ponto digital', 'app de ponto', 'ponto pelo celular',
    'banco de horas', 'espelho de ponto', 'folha de ponto',
    'gestão de equipe', 'RH digital', 'Portaria 671',
  ],
  authors: [{ name: 'WorkID' }],
  creator: 'WorkID',
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: BASE_URL,
    siteName: 'WorkID',
    title: 'WorkID - Sistema de Ponto Digital com GPS e Reconhecimento Facial',
    description: 'Controle de ponto digital para empresas. Registro por GPS, reconhecimento facial, relatórios e banco de horas. Teste grátis 14 dias.',
    images: [{
      url: '/images/og-image.png',
      width: 1200,
      height: 630,
      alt: 'WorkID - Sistema de Ponto Digital',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkID - Sistema de Ponto Digital',
    description: 'Controle de ponto por GPS e reconhecimento facial. Teste grátis 14 dias.',
    images: ['/images/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'zTBmoD_CK0UDF4I-p1L2vCjmTA_q6Ayzv2esXNAei6k',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleAnalytics />
        <ThemeProvider>
          <Provider>
            <ThemeSyncer />
            <ServiceWorkerRegistrar />
            <AutoLoginRestore />
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
