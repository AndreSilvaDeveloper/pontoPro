'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Instagram, Mail, MessageCircle } from 'lucide-react'

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const instagramHandle = '@ontimeponto'
  const instagramUrl = 'https://www.instagram.com/ontimeponto/'

  const email = 'andreworkid@gmail.com'
  const emailUrl = `mailto:${email}`

  const whatsappNumber = '5532935005492'
  const whatsappLabel = '+55 32 93500-5492'
  const whatsappText = encodeURIComponent('Olá! Vim pelo site OntimeIA. Quero conhecer o sistema e valores.')
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`

  const itemClass =
    'w-full flex items-center gap-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-transparent p-3 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20'

  const iconWrapClass =
    'flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/20'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] border-purple-500/20 bg-[#0a0e27]/80 text-white backdrop-blur-xl sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center text-2xl font-extrabold text-white md:text-3xl">
            Contato
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-4">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass}
          >
            <div className={iconWrapClass}>
              <Instagram className="size-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400">Instagram</p>
              <p className="truncate text-sm font-bold text-white">{instagramHandle}</p>
            </div>
          </a>

          <a href={emailUrl} className={itemClass}>
            <div className={iconWrapClass}>
              <Mail className="size-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400">Email</p>
              <p className="truncate text-sm font-bold text-white">{email}</p>
            </div>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass}
          >
            <div className={iconWrapClass}>
              <MessageCircle className="size-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400">WhatsApp</p>
              <p className="truncate text-sm font-bold text-white">{whatsappLabel}</p>
            </div>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
