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
import GoogleTagManager, { GoogleTagManagerNoScript } from "@/components/GoogleTagManager";
import MetaPixel from "@/components/MetaPixel";
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
    default: 'Ponto Eletrônico Digital com GPS e Reconhecimento Facial | WorkID',
    template: '%s | WorkID',
  },
  description: 'Ponto eletrônico digital em conformidade com a Portaria 671. Registro por GPS, reconhecimento facial, banco de horas, espelho de ponto e relatórios automáticos. Teste grátis 14 dias.',
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
    title: 'Ponto Eletrônico Digital com GPS e Reconhecimento Facial | WorkID',
    description: 'Ponto eletrônico digital em conformidade com a Portaria 671. GPS, reconhecimento facial, banco de horas e relatórios. Teste grátis 14 dias.',
    images: [{
      url: '/images/og-image.png',
      width: 1200,
      height: 630,
      alt: 'WorkID - Ponto Eletrônico Digital',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ponto Eletrônico Digital | WorkID',
    description: 'Ponto eletrônico digital por GPS e reconhecimento facial. Portaria 671. Teste grátis 14 dias.',
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
    other: {
      'facebook-domain-verification': 'sp8gf0t8dgmqoml9tk8tawogog7b77',
    },
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
        <GoogleTagManagerNoScript />
        <GoogleTagManager />
        <GoogleAnalytics />
        <MetaPixel />
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
