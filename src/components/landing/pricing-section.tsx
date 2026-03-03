"use client";

import Link from "next/link";
import { Check, X, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANOS, type PlanoId } from "@/config/planos";

const PLANOS_ORDER: PlanoId[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

const FEATURES: {
  label: string;
  getValue: (plano: PlanoId) => string | boolean;
}[] = [
  {
    label: "Funcionários inclusos",
    getValue: (p) => `Até ${PLANOS[p].maxFuncionarios}`,
  },
  {
    label: "Administradores",
    getValue: (p) => `${PLANOS[p].maxAdmins}`,
  },
  {
    label: "Filiais",
    getValue: (p) =>
      PLANOS[p].maxFiliais < 0
        ? "Ilimitadas"
        : PLANOS[p].maxFiliais === 0
          ? "Apenas sede"
          : `Até ${PLANOS[p].maxFiliais}`,
  },
  {
    label: "Funcionário extra",
    getValue: (p) => `R$ ${PLANOS[p].extraFuncionario.toFixed(2).replace(".", ",")}/cada`,
  },
  {
    label: "Admin extra",
    getValue: (p) => `R$ ${PLANOS[p].extraAdmin.toFixed(2).replace(".", ",")}/cada`,
  },
  {
    label: "Filial extra",
    getValue: (p) =>
      PLANOS[p].maxFiliais < 0
        ? "Ilimitadas"
        : `R$ ${PLANOS[p].extraFilial.toFixed(2).replace(".", ",")}/cada`,
  },
  {
    label: "Reconhecimento facial",
    getValue: (p) => PLANOS[p].reconhecimentoFacial,
  },
  {
    label: "Relatórios PDF",
    getValue: (p) => PLANOS[p].relatoriosPdf === "COMPLETO" ? "Completo" : "Básico",
  },
  {
    label: "Suporte prioritário",
    getValue: (p) => PLANOS[p].suporte === "PRIORITARIO",
  },
  {
    label: "Suporte WhatsApp",
    getValue: (p) => PLANOS[p].suporte !== "EMAIL",
  },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="size-5 text-emerald-400" />
    ) : (
      <X className="size-5 text-slate-600" />
    );
  }
  return <span className="text-sm text-slate-300">{value}</span>;
}

export function PricingSection() {
  return (
    <section id="pricing" className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
      <div className="container mx-auto">
        <div className="mb-12 text-center md:mb-16">
          <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
            Planos
          </Badge>
          <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl lg:text-6xl">
            Escolha o plano ideal
          </h2>
          <p className="mx-auto max-w-2xl text-balance text-lg text-gray-400">
            Comece com 14 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {PLANOS_ORDER.map((planoId) => {
            const plano = PLANOS[planoId];
            const isPopular = planoId === "PROFESSIONAL";

            return (
              <div
                key={planoId}
                className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-all md:p-8 ${
                  isPopular
                    ? "border-purple-500/50 bg-gradient-to-b from-purple-950/60 to-purple-950/20 shadow-xl shadow-purple-500/20 scale-[1.02] md:scale-105"
                    : "border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-transparent hover:border-purple-500/40"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="border-purple-400/50 bg-purple-600 px-4 py-1 text-xs font-bold text-white shadow-lg shadow-purple-500/30">
                      <Crown className="mr-1 size-3" />
                      Mais popular
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white">{plano.nome}</h3>
                  <p className="mt-1 text-sm text-gray-400">{plano.descricao}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-gray-400">R$</span>
                    <span className="text-4xl font-extrabold text-white">
                      {plano.preco.toFixed(2).replace(".", ",").split(",")[0]}
                    </span>
                    <span className="text-lg font-bold text-gray-300">
                      ,{plano.preco.toFixed(2).split(".")[1]}
                    </span>
                    <span className="text-sm text-gray-500">/mês</span>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  asChild
                  className={`mb-6 w-full py-6 text-base font-bold ${
                    isPopular
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/50 hover:bg-purple-700"
                      : "border border-purple-500/30 bg-transparent text-white hover:bg-purple-950/50"
                  }`}
                >
                  <Link href={`/signup?plano=${planoId}`}>
                    Começar grátis
                  </Link>
                </Button>

                {/* Features */}
                <div className="flex-1 space-y-3">
                  {FEATURES.map((feature) => {
                    const value = feature.getValue(planoId);
                    return (
                      <div
                        key={feature.label}
                        className="flex items-center justify-between gap-2 border-b border-purple-500/10 pb-2 last:border-0"
                      >
                        <span className="text-sm text-gray-400">{feature.label}</span>
                        <FeatureValue value={value} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <p className="mt-8 text-center text-sm text-gray-500">
          Todos os planos incluem: registro de ponto por GPS, dashboard em tempo real, controle de
          ausências e feriados, e exportação de relatórios.
        </p>
      </div>
    </section>
  );
}
