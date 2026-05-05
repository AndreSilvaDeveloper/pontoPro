"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Crown, Tag, Copy, Check as CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PLANOS,
  getPrecoAnual,
  type PlanoId,
  type BillingCycle,
  type PlanoConfig,
  ANNUAL_DISCOUNT,
} from "@/config/planos";

type PlanoLanding = PlanoConfig & { ordem: number; destaque: boolean; visivel: boolean };

type CupomLanding = {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'PERCENTUAL' | 'VALOR_FIXO' | 'MESES_GRATIS' | 'TRIAL_ESTENDIDO';
  valor: number;
  duracaoMeses: number;
  descricao: string | null;
  destaque: string | null;
};

/**
 * Encontra o cupom de maior valor monetário aplicável a um plano específico.
 * Filtra por:
 * - cupons sem restrição de plano (apenasPlanos vazio) OU que incluem o plano atual
 * - retorna o que oferece maior desconto sobre o preço mensal
 */
function melhorCupomParaPlano(cupons: CupomLanding[], plano: PlanoLanding, planosAplicaveis: Record<string, string[]>): CupomLanding | null {
  const aplicaveis = cupons.filter(c => {
    const restritos = planosAplicaveis[c.id] || [];
    return restritos.length === 0 || restritos.includes(plano.id);
  });
  if (aplicaveis.length === 0) return null;

  const score = (c: CupomLanding) => {
    if (c.tipo === 'PERCENTUAL') return plano.preco * (c.valor / 100);
    if (c.tipo === 'VALOR_FIXO') return Math.min(c.valor, plano.preco);
    if (c.tipo === 'MESES_GRATIS') return plano.preco * c.valor;
    if (c.tipo === 'TRIAL_ESTENDIDO') return c.valor * 0.5; // baixo (trial é benefício, não desconto direto)
    return 0;
  };
  return aplicaveis.sort((a, b) => score(b) - score(a))[0];
}

function aplicarDesconto(plano: PlanoLanding, cupom: CupomLanding | null, valorOriginal: number): {
  valorComDesconto: number;
  resumoPequeno: string;
  duracaoTexto: string;
} | null {
  if (!cupom) return null;

  const dur = cupom.duracaoMeses === -1
    ? 'sempre'
    : cupom.duracaoMeses === 1
      ? '1ª parcela'
      : `${cupom.duracaoMeses} primeiras parcelas`;

  switch (cupom.tipo) {
    case 'PERCENTUAL': {
      const v = Number((valorOriginal * (1 - cupom.valor / 100)).toFixed(2));
      return { valorComDesconto: v, resumoPequeno: `${cupom.valor}% off`, duracaoTexto: dur };
    }
    case 'VALOR_FIXO': {
      const v = Number(Math.max(0, valorOriginal - cupom.valor).toFixed(2));
      return { valorComDesconto: v, resumoPequeno: `R$ ${cupom.valor.toFixed(2).replace('.', ',')} off`, duracaoTexto: dur };
    }
    case 'MESES_GRATIS':
      return {
        valorComDesconto: 0,
        resumoPequeno: `${cupom.valor} ${cupom.valor === 1 ? 'mês grátis' : 'meses grátis'}`,
        duracaoTexto: 'após o trial',
      };
    case 'TRIAL_ESTENDIDO':
      return {
        valorComDesconto: valorOriginal,
        resumoPequeno: `+${cupom.valor} dias de teste`,
        duracaoTexto: 'gratuito',
      };
  }
}

const PLANOS_FALLBACK: PlanoLanding[] = (["STARTER", "PROFESSIONAL", "ENTERPRISE"] as PlanoId[]).map((id, i) => ({
  ...PLANOS[id],
  ordem: i + 1,
  destaque: id === "PROFESSIONAL",
  visivel: true,
}));

function buildFeatures(plano: PlanoLanding): { label: string; value: string | boolean }[] {
  return [
    { label: "Funcionários inclusos", value: `Até ${plano.maxFuncionarios}` },
    { label: "Administradores", value: `${plano.maxAdmins}` },
    {
      label: "Filiais",
      value:
        plano.maxFiliais < 0
          ? "Ilimitadas"
          : plano.maxFiliais === 0
            ? "Apenas sede"
            : `Até ${plano.maxFiliais}`,
    },
    { label: "Funcionário extra", value: `R$ ${plano.extraFuncionario.toFixed(2).replace(".", ",")}/cada` },
    { label: "Admin extra", value: `R$ ${plano.extraAdmin.toFixed(2).replace(".", ",")}/cada` },
    {
      label: "Filial extra",
      value:
        plano.maxFiliais < 0
          ? "Ilimitadas"
          : `R$ ${plano.extraFilial.toFixed(2).replace(".", ",")}/cada`,
    },
    { label: "Reconhecimento facial", value: plano.reconhecimentoFacial },
    {
      label: "Modo Totem (tablet)",
      value: plano.totemIncluso
        ? true
        : `+R$ ${plano.totemAddonMatriz.toFixed(2).replace(".", ",")}/mês`,
    },
    { label: "Relatórios PDF", value: plano.relatoriosPdf === "COMPLETO" ? "Completo" : "Básico" },
    { label: "Suporte prioritário", value: plano.suporte === "PRIORITARIO" },
    { label: "Suporte WhatsApp", value: plano.suporte !== "EMAIL" },
  ];
}

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
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [planos, setPlanos] = useState<PlanoLanding[]>(PLANOS_FALLBACK);
  const [cupons, setCupons] = useState<CupomLanding[]>([]);
  const [planosAplicaveis, setPlanosAplicaveis] = useState<Record<string, string[]>>({});
  const [copiado, setCopiado] = useState<string | null>(null);
  const isYearly = cycle === "YEARLY";

  useEffect(() => {
    fetch("/api/planos/publico")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.planos?.length) {
          setPlanos(
            d.planos
              .filter((p: PlanoLanding) => p.visivel)
              .sort((a: PlanoLanding, b: PlanoLanding) => a.ordem - b.ordem)
          );
        }
      })
      .catch(() => { /* fallback já está em estado inicial */ });

    fetch("/api/cupons/landing")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.cupons?.length) {
          setCupons(d.cupons);
          const map: Record<string, string[]> = {};
          for (const c of d.cupons) map[c.id] = Array.isArray(c.apenasPlanos) ? c.apenasPlanos : [];
          setPlanosAplicaveis(map);
        }
      })
      .catch(() => {});
  }, []);

  const copiar = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 1500);
  };

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

          {/* Toggle Mensal / Anual */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-950/40 p-1">
            <button
              onClick={() => setCycle("MONTHLY")}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                !isYearly
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle("YEARLY")}
              className={`relative rounded-full px-5 py-2 text-sm font-bold transition-all ${
                isYearly
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Anual
              <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                -10%
              </span>
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className={`mx-auto grid max-w-5xl gap-6 ${planos.length === 1 ? '' : planos.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {planos.map((plano) => {
            const planoId = plano.id;
            const isPopular = plano.destaque;
            const anual = getPrecoAnual(plano);

            const displayPrice = isYearly ? anual.anual : plano.preco;
            const displayPriceFormatted = displayPrice.toFixed(2).replace(".", ",");
            const [intPart, decPart] = displayPriceFormatted.split(",");

            const cupomDoPlano = melhorCupomParaPlano(cupons, plano, planosAplicaveis);
            const descontoInfo = aplicarDesconto(plano, cupomDoPlano, plano.preco);

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
                      {intPart}
                    </span>
                    <span className="text-lg font-bold text-gray-300">
                      ,{decPart}
                    </span>
                    <span className="text-sm text-gray-500">
                      /{isYearly ? "ano" : "mês"}
                    </span>
                  </div>
                  {isYearly && (
                    <p className="mt-1 text-sm text-emerald-400">
                      R$ {anual.mensalEquivalente.toFixed(2).replace(".", ",")}/mês
                      {" "}&mdash; economize R$ {anual.economia.toFixed(2).replace(".", ",")}
                    </p>
                  )}
                  {!isYearly && (
                    <p className="mt-1 text-xs text-gray-500">
                      ou R$ {anual.anual.toFixed(2).replace(".", ",")}/ano com 10% off
                    </p>
                  )}
                </div>

                {/* Cupom inline */}
                {cupomDoPlano && descontoInfo && (
                  <div className="mb-5 -mt-2 p-3 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30">
                    <div className="flex items-start gap-2">
                      <Tag size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {cupomDoPlano.destaque && (
                          <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 mr-1.5 mb-1">
                            {cupomDoPlano.destaque}
                          </span>
                        )}
                        <p className="text-[12px] leading-snug text-amber-100">
                          {(cupomDoPlano.tipo === 'PERCENTUAL' || cupomDoPlano.tipo === 'VALOR_FIXO') ? (
                            <>
                              Pague <strong className="text-white">R$ {descontoInfo.valorComDesconto.toFixed(2).replace('.', ',')}</strong>
                              {' '}nas <strong className="text-white">{descontoInfo.duracaoTexto}</strong>
                              <span className="text-amber-300/70 ml-1">({descontoInfo.resumoPequeno})</span>
                            </>
                          ) : (
                            <strong className="text-white">{descontoInfo.resumoPequeno}</strong>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => copiar(cupomDoPlano.codigo)}
                          className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-200 hover:text-amber-100 transition-colors"
                        >
                          {copiado === cupomDoPlano.codigo ? (
                            <><CheckIcon size={10} /> Copiado!</>
                          ) : (
                            <>Use {cupomDoPlano.codigo} <Copy size={10} /></>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                  {buildFeatures(plano).map((feature) => (
                    <div
                      key={feature.label}
                      className="flex items-center justify-between gap-2 border-b border-purple-500/10 pb-2 last:border-0"
                    >
                      <span className="text-sm text-gray-400">{feature.label}</span>
                      <FeatureValue value={feature.value} />
                    </div>
                  ))}
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
