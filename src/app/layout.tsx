import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Provider from "@/providers/SessionProvider"; // Importe o Provider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WorkID - Gestão Inteligente",
  description: "Sistema de Ponto com Biometria e Geolocalização",
  manifest: "/manifest.json",
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
          {children}
        </Provider>
      </body>
    </html>
  );
}