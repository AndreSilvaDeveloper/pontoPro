'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Zap, Smartphone, Eye } from 'lucide-react'

interface PillarsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PillarsModal({ open, onOpenChange }: PillarsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-purple-500/20 bg-[#0a0e27]/80 text-white backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-white md:text-3xl">
            Nossos Pilares
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 pt-4 md:grid-cols-3">
          {/* Inovação */}
          <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
            <CardHeader>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                <Zap className="size-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Inovação</CardTitle>
              <CardDescription className="text-gray-300">
                Tecnologia de ponta com{' '}
                <span className="font-bold text-white">IA</span> para gestão{' '}
                <span className="font-bold text-white">preditiva</span>.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Mobilidade */}
          <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
            <CardHeader>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                <Smartphone className="size-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Mobilidade</CardTitle>
              <CardDescription className="text-gray-300">
                Experiência{' '}
                <span className="font-bold text-white">mobile fluida</span> para bater ponto de{' '}
                <span className="font-bold text-white">qualquer lugar</span>.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Transparência */}
          <Card className="border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent backdrop-blur-sm">
            <CardHeader>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                <Eye className="size-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Transparência</CardTitle>
              <CardDescription className="text-gray-300">
                Dados{' '}
                <span className="font-bold text-white">claros</span> e relatórios{' '}
                <span className="font-bold text-white">automatizados</span> para gestores e colaboradores.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
