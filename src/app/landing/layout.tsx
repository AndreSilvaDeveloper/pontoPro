import { Metadata } from 'next';
import { BASE_URL } from '@/config/site';

export const metadata: Metadata = {
  title: 'WorkID - Sistema de Ponto Digital com GPS e Reconhecimento Facial',
  description: 'Controle de ponto digital para empresas. Registro por GPS, reconhecimento facial, relatórios automáticos, banco de horas e espelho de ponto. Teste grátis 14 dias. Sem cartão de crédito.',
  alternates: { canonical: BASE_URL },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'WorkID',
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      sameAs: ['https://instagram.com/workid.app'],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: 'Portuguese',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'WorkID',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, iOS',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BRL',
        description: '14 dias grátis para testar',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '500',
        bestRating: '5',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Como funciona o período de teste gratuito?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Ao criar sua conta, você tem 14 dias para testar todas as funcionalidades do WorkID sem nenhum custo. Não pedimos cartão de crédito. Ao final do período, você escolhe o plano que melhor se encaixa na sua empresa.',
          },
        },
        {
          '@type': 'Question',
          name: 'Meus funcionários precisam instalar algum aplicativo?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Não. O WorkID funciona diretamente pelo navegador do celular, como um app (PWA). Basta acessar o link e adicionar à tela inicial. Não ocupa espaço no celular e funciona offline.',
          },
        },
        {
          '@type': 'Question',
          name: 'O sistema funciona para equipes remotas ou externas?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim! O WorkID registra o ponto por GPS, então funciona para equipes em campo, home office ou qualquer local. Você pode definir raios de localização ou liberar o ponto de qualquer lugar.',
          },
        },
        {
          '@type': 'Question',
          name: 'Posso gerenciar várias filiais com uma única conta?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. Nos planos Professional e Enterprise, você pode criar filiais vinculadas à sua empresa principal. Cada filial tem suas próprias configurações, funcionários e relatórios.',
          },
        },
        {
          '@type': 'Question',
          name: 'Os relatórios são aceitos como comprovante legal?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O WorkID está em conformidade com a Portaria 671 do MTE. Os relatórios incluem espelho de ponto, banco de horas e horas extras, prontos para enviar ao contador ou apresentar em caso de fiscalização.',
          },
        },
        {
          '@type': 'Question',
          name: 'Posso trocar de plano a qualquer momento?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento pelo painel administrativo. A mudança é aplicada imediatamente.',
          },
        },
      ],
    },
  ],
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
