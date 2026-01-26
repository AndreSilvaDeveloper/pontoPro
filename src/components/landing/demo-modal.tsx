'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DemoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  const videoId = 'K8pNHlq31EQ' // seu ID do vídeo

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] border-purple-500/20 bg-[#0a0e27]/90 text-white backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-extrabold text-white md:text-2xl">
            Demonstração do OntimeIA
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 overflow-hidden rounded-2xl border border-purple-500/20">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
              title="Demonstração OntimeIA"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400">
          Dica: clique em tela cheia para ver melhor.
        </p>
      </DialogContent>
    </Dialog>
  )
}
