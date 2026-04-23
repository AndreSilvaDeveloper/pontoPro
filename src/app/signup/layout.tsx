import { Metadata } from 'next';
import { BASE_URL } from '@/config/site';

export const metadata: Metadata = {
  title: 'Cadastro Grátis | Ponto Eletrônico Digital WorkID',
  description: 'Crie sua conta no WorkID e teste grátis por 14 dias. Ponto eletrônico digital com GPS e reconhecimento facial em conformidade com a Portaria 671. Sem cartão de crédito.',
  alternates: { canonical: `${BASE_URL}/signup` },
  openGraph: {
    title: 'Cadastro Grátis | Ponto Eletrônico Digital WorkID',
    description: 'Teste o WorkID grátis por 14 dias. Ponto digital com GPS, reconhecimento facial e banco de horas.',
    url: `${BASE_URL}/signup`,
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
