'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Instagram, Mail, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] border-purple-500/20 bg-[#0a0e27]/80 text-white backdrop-blur-xl sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center text-2xl font-extrabold text-white md:text-3xl">
            Contato
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-3 pt-4">
          {/* Instagram */}
          <Link
            href="https://instagram.com/ontimeia"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-transparent p-3 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/20">
              <Instagram className="size-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400">Instagram</p>
              <p className="truncate text-sm font-bold text-white">@ontimeia</p>
            </div>
          </Link>

          {/* Email */}
          <a
            href="mailto:contato@ontimeia.com"
            className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-transparent p-3 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/20">
              <Mail className="size-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400">Email</p>
              <p className="truncate text-sm font-bold text-white">contato@ontimeia.com</p>
            </div>
          </a>

          {/* WhatsApp */}
          <Link
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-transparent p-3 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/20">
              <MessageCircle className="size-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400">WhatsApp</p>
              <p className="truncate text-sm font-bold text-white">+55 11 99999-9999</p>
            </div>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
