'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Lightbulb, Sparkles, Target } from 'lucide-react'

interface AboutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-purple-500/20 bg-[#0a0e27]/80 text-white backdrop-blur-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-white md:text-3xl">
            Sobre Nós
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* A Origem */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                <Lightbulb className="size-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">A Origem</h3>
            </div>
            <p className="text-pretty leading-relaxed text-gray-300">
              O WorkID nasceu da necessidade de simplificar o que era complexo. Percebemos que as empresas modernas perdiam horas valiosas em processos de gestão de ponto burocráticos e ultrapassados.
            </p>
          </div>

          {/* A Evolução */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                <Sparkles className="size-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">A Evolução</h3>
            </div>
            <p className="text-pretty leading-relaxed text-gray-300">
              Unimos a robustez da tecnologia de gestão com o poder da{' '}
              <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                inteligência artificial
              </span>{' '}
              para criar uma plataforma que não apenas registra horas, mas{' '}
              <span className="font-bold text-white">otimiza</span> a{' '}
              <span className="font-bold text-white">produtividade</span> das equipes em{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text font-bold text-transparent">
                tempo real
              </span>.
            </p>
          </div>

          {/* A Missão */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-purple-600/20">
                <Target className="size-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">A Missão</h3>
            </div>
            <p className="text-pretty leading-relaxed text-gray-300">
              Nossa missão é devolver o{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text font-bold text-transparent">
                tempo
              </span>{' '}
              para quem realmente importa: as pessoas. Criamos soluções inteligentes para empresas que buscam{' '}
              <span className="font-bold text-white">praticidade</span>,{' '}
              <span className="font-bold text-white">mobilidade</span> e precisão.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
