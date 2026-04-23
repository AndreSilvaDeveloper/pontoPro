'use client';

import { useMemo, useState } from 'react';
import { Calculator, TrendingDown, Clock, DollarSign, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Calculadora de ROI:
 * - Tempo que o RH gasta hoje por funcionário/mês (fechando folha manualmente)
 * - Com WorkID, esse tempo cai em ~85% (empresas relatam entre 80-90%)
 * - Custo: R$ 9,90 por funcionário ativo (plano atual)
 * - Custo do RH: salário médio ~R$ 4.500 / 160h = R$ 28,12/h
 */
const CUSTO_HORA_RH = 28;
const REDUCAO_TEMPO = 0.85;
const PRECO_WORKID = 9.9;

export default function ROICalculator() {
  const [funcionarios, setFuncionarios] = useState(20);
  const [minutosPorFunc, setMinutosPorFunc] = useState(25);

  const calc = useMemo(() => {
    // tempo total gasto hoje (minutos/mês)
    const minutosTotaisAtual = funcionarios * minutosPorFunc;
    const horasAtual = minutosTotaisAtual / 60;

    // custo humano mensal
    const custoRHAtual = horasAtual * CUSTO_HORA_RH;

    // com WorkID
    const horasEconomizadas = horasAtual * REDUCAO_TEMPO;
    const custoRHNovo = custoRHAtual * (1 - REDUCAO_TEMPO);
    const custoWorkID = funcionarios * PRECO_WORKID;
    const economia = custoRHAtual - custoRHNovo - custoWorkID;

    return {
      horasAtual,
      custoRHAtual,
      horasEconomizadas,
      custoWorkID,
      economiaMes: Math.max(0, economia),
      economiaAno: Math.max(0, economia) * 12,
    };
  }, [funcionarios, minutosPorFunc]);

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <section className="relative z-10 px-4 py-12 md:px-6 md:py-16 lg:py-20">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-10 text-center md:mb-12">
          <Badge className="mb-4 border-purple-500/50 bg-purple-950/50 text-purple-300">
            Calculadora de ROI
          </Badge>
          <h2 className="mb-4 text-[32px] font-extrabold text-white md:text-5xl">
            Quanto você{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              economiza
            </span>
            {' '}por mês?
          </h2>
          <p className="mx-auto max-w-2xl text-base text-gray-400 md:text-lg">
            Ajuste os controles e descubra quanto tempo e dinheiro sua empresa recupera com o WorkID.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/30 to-transparent p-6 md:p-10 backdrop-blur-sm">

          {/* Inputs */}
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-3 block">
                Quantos funcionários sua empresa tem?
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={funcionarios}
                  onChange={(e) => setFuncionarios(Number(e.target.value))}
                  className="flex-1 accent-purple-500 h-2"
                />
                <div className="w-20 text-right">
                  <span className="text-2xl font-extrabold text-white tabular-nums">{funcionarios}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-3 block">
                Minutos gastos pelo RH por funcionário/mês
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={minutosPorFunc}
                  onChange={(e) => setMinutosPorFunc(Number(e.target.value))}
                  className="flex-1 accent-purple-500 h-2"
                />
                <div className="w-20 text-right">
                  <span className="text-2xl font-extrabold text-white tabular-nums">{minutosPorFunc}</span>
                  <span className="text-xs text-gray-400 block">min</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Incluindo conferência de cartões, correções, fechamento e relatórios.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-red-400" />
                <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">Seu cenário atual</span>
              </div>
              <p className="text-sm text-gray-300">
                Seu RH gasta <strong className="text-white">{calc.horasAtual.toFixed(1)}h/mês</strong> fazendo o controle manual.
              </p>
              <p className="text-sm text-gray-300 mt-1">
                Custo estimado: <strong className="text-red-300">{fmt(calc.custoRHAtual)}/mês</strong>
              </p>
            </div>
          </div>

          {/* Resultado */}
          <div className="flex flex-col justify-between gap-6">
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown size={16} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Você economiza</span>
                </div>
                <div className="text-5xl md:text-6xl font-black text-emerald-400 tabular-nums leading-none mb-1">
                  {fmt(calc.economiaMes)}
                </div>
                <p className="text-sm text-emerald-200/80 font-semibold">por mês</p>
                <p className="text-xs text-gray-400 mt-2">{fmt(calc.economiaAno)} por ano</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-border-subtle">
                <span className="flex items-center gap-2 text-gray-300">
                  <Clock size={14} className="text-purple-400" />
                  Horas recuperadas
                </span>
                <span className="font-bold text-white tabular-nums">{calc.horasEconomizadas.toFixed(0)}h/mês</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-border-subtle">
                <span className="flex items-center gap-2 text-gray-300">
                  <DollarSign size={14} className="text-purple-400" />
                  Custo do WorkID
                </span>
                <span className="font-bold text-white tabular-nums">{fmt(calc.custoWorkID)}/mês</span>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-xl shadow-purple-500/40"
            >
              <Link href="/signup">
                Começar a economizar agora
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4 max-w-2xl mx-auto">
          <Calculator size={12} className="inline mr-1" />
          Estimativa baseada em custo/hora médio de RH (R$ 28/h) e redução de 85% no tempo manual reportada por clientes WorkID.
          Valores podem variar conforme o porte da empresa.
        </p>
      </div>
    </section>
  );
}
