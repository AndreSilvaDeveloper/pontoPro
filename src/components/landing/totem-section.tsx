"use client";

import Link from "next/link";
import { Smartphone, Check, ScanFace, Shield, Tablet, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BENEFICIOS = [
  {
    icon: Tablet,
    titulo: "Funciona em qualquer tablet",
    texto: "Sem hardware proprietário. Use um Galaxy Tab A8 (~R$ 600) ou um celular antigo com câmera frontal.",
  },
  {
    icon: ScanFace,
    titulo: "Reconhecimento facial 1:N",
    texto: "Funcionário chega no tablet, mostra o rosto, registra ponto. Sem login, sem código, sem app pessoal.",
  },
  {
    icon: Zap,
    titulo: "Tipo automático",
    texto: "O sistema deduz Entrada / Almoço / Café / Saída pela sequência do dia. Funcionário só aperta um botão.",
  },
  {
    icon: Shield,
    titulo: "Bloqueia ponto pelo celular",
    texto: "Se quiser, impede que funcionários batam ponto pelo aparelho pessoal. Tudo passa pelo tablet da empresa.",
  },
];

export function TotemSection() {
  return (
    <section id="totem" className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
      <div className="container mx-auto">
        <div className="mb-12 text-center md:mb-16">
          <Badge className="mb-4 border-cyan-500/50 bg-cyan-950/40 text-cyan-300">
            <Smartphone className="mr-1 size-3" /> Novo: Modo Totem
          </Badge>
          <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
            Não quer ponto pelo celular do funcionário?
          </h2>
          <p className="mx-auto max-w-3xl text-balance text-lg text-gray-400">
            Coloque um <strong className="text-white">tablet único na recepção</strong>, e a equipe inteira bate ponto
            pelo rosto. Sem app no celular, sem GPS, sem login. Como um relógio de ponto físico — só que via software.
          </p>
        </div>

        {/* Grid de benefícios + mockup */}
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
          {/* Esquerda: benefícios */}
          <div className="space-y-4">
            {BENEFICIOS.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.titulo}
                  className="flex gap-4 rounded-2xl border border-purple-500/15 bg-purple-950/20 p-5 backdrop-blur-sm transition-colors hover:border-cyan-500/30 hover:bg-purple-950/30"
                >
                  <div className="shrink-0">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20">
                      <Icon size={20} />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-white">{b.titulo}</div>
                    <p className="mt-1 text-sm leading-relaxed text-gray-400">{b.texto}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direita: mockup do totem */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative rounded-[2rem] border border-purple-500/30 bg-gradient-to-br from-[#0a0e27] via-[#0f1535] to-[#0a0e27] p-8 shadow-2xl shadow-cyan-500/10">
              <div className="absolute inset-0 rounded-[2rem] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
              <div className="relative">
                {/* Header simulado */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-purple-300/80">SUA EMPRESA</div>
                    <div className="mt-0.5 text-[9px] text-white/40">Totem: Recepção</div>
                  </div>
                  <div className="text-[9px] text-white/30">sair</div>
                </div>

                {/* Conteúdo central */}
                <div className="py-8 text-center">
                  <div className="mx-auto mb-6 inline-flex size-24 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check size={56} className="text-emerald-400" strokeWidth={3} />
                  </div>
                  <div className="mb-1 text-2xl font-extrabold text-white">Bom dia, Maria!</div>
                  <p className="mb-4 text-base text-white/70">Tenha um ótimo dia de trabalho.</p>
                  <p className="mb-3 text-xs text-white/40">Entrada registrada</p>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    <span className="text-base font-bold tabular-nums text-white">08:02</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decoração */}
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-cyan-500/10 to-purple-500/10 blur-3xl" />
          </div>
        </div>

        {/* Preço destaque */}
        <div className="mx-auto mt-16 max-w-3xl rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-purple-950/20 to-transparent p-8 text-center backdrop-blur-sm">
          <div className="mb-3 text-xs uppercase font-bold tracking-widest text-cyan-300">Quanto custa</div>
          <div className="mb-2 text-3xl font-extrabold text-white md:text-4xl">
            +R$ 49,90<span className="text-xl text-gray-400">/mês</span>
          </div>
          <p className="text-sm text-gray-400">
            Adicional opcional aos planos <strong className="text-white">Starter</strong> e <strong className="text-white">Professional</strong>.
            <strong className="block mt-1 text-emerald-400">Incluso de graça no Enterprise.</strong>
          </p>
          <p className="mt-2 text-xs text-gray-500">+ R$ 29,90/mês por filial extra que usar o totem</p>

          <Button
            asChild
            className="mt-6 bg-gradient-to-br from-cyan-500 to-purple-600 px-8 py-6 text-base font-bold text-white shadow-xl shadow-cyan-500/30 hover:from-cyan-400 hover:to-purple-500"
          >
            <Link href="#pricing">Ver planos</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
