import { Metadata } from 'next';
import { BASE_URL } from '@/config/site';

export const metadata: Metadata = {
  title: 'Agende uma Demonstração | Ponto Eletrônico Digital WorkID',
  description: 'Agende uma demo gratuita do WorkID e veja na prática como funciona o ponto eletrônico digital com GPS, reconhecimento facial e banco de horas. Sem compromisso.',
  alternates: { canonical: `${BASE_URL}/agendar-demo` },
  openGraph: {
    title: 'Agende uma Demonstração | Ponto Eletrônico Digital WorkID',
    description: 'Veja o WorkID em ação. Demonstração gratuita do ponto eletrônico digital mais completo do mercado.',
    url: `${BASE_URL}/agendar-demo`,
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function AgendarDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
