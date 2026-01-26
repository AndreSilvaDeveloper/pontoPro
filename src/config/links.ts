export const LINKS = {
  demoVideo: {
    id: 'K8pNHlq31EQ',
    shortUrl: 'https://www.youtube.com/watch?v=K8pNHIq31EQ', 
  },

  whatsapp: {
    // só números: país + DDD + número
    number: '5532991473554',

    messages: {
      agendarDemo:
        'Olá! Vim pelo site do OntimeIA e gostaria de agendar uma demonstração do sistema. Qual o melhor horário?',
      suporteGeral:
        'Olá! Vim pelo site do OntimeIA. Pode me ajudar, por favor?',
    },
  },

  instagram: {
    handle: '@ontimeponto',
    url: 'https://www.instagram.com/ontimeponto/',
  },

  email: {
    address: 'contato@ontimeia.com',
  },
} as const

export function waLink(text: string) {
  return `https://wa.me/${LINKS.whatsapp.number}?text=${encodeURIComponent(text)}`
}

export function mailto(email: string) {
  return `mailto:${email}`
}

export function ytEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
}
