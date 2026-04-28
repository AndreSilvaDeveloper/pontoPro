import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Totem WorkID',
  description: 'Bater ponto pelo rosto',
  manifest: '/totem-manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Totem',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0e27',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function TotemLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
