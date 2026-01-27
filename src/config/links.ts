export const LINKS = {
  demoVideo: {
    // ✅ mantenha UM ÚNICO ID e gere a URL a partir dele
    id: 'K8pNHlq31EQ',
    shortUrl: 'https://www.youtube.com/watch?v=K8pNHlq31EQ',
    // se preferir ainda mais “universal”:
    // shortUrl: 'https://youtu.be/K8pNHlq31EQ',
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

// ✅ mais compatível que wa.me em muitos mobiles/webviews
export function waLink(text: string) {
  const phone = LINKS.whatsapp.number.replace(/\D/g, '')
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
}

export function mailto(email: string) {
  return `mailto:${email}`
}

export function ytEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
}
