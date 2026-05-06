"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Crown,
  Users,
  UserCog,
  Building2,
  TrendingUp,
  AlertTriangle,
  Smartphone,
  Tag,
  Sparkles,
} from "lucide-react";
import type { PlanoConfig, PlanoId, BillingCycle } from "@/config/planos";

type CupomAtivo = {
  uso: { id: string; cupomId: string; parcelasAplicadas: number; parcelasMax: number; valorAplicadoTotal: number };
  cupom: { id: string; codigo: string; nome: string; tipo: string; valor: number; duracaoMeses: number; descricao: string | null };
  desconto: number;
  valorOriginal: number;
  valorComDesconto: number;
  parcelasRestantes: number;
  resumoTexto: string;
};

type PrecoAnual = {
  mensal: number;
  anual: number;
  mensalEquivalente: number;
  economia: number;
};

type PlanoComAnual = PlanoConfig & { precoAnual: PrecoAnual };

type PlanoData = {
  ok: boolean;
  planoAtual: PlanoId;
  planoConfig: PlanoConfig;
  billingCycle: BillingCycle;
  uso: { funcionarios: number; admins: number; filiais: number };
  calculo: {
    valorBase: number;
    extraFunc: number;
    extraAdm: number;
    extraFil: number;
    totem: number;
    totalMensal: number;
    desconto: number;
    cycle: BillingCycle;
    total: number;
    negociado?: boolean;
  };
  planos: PlanoComAnual[];
  isFilial: boolean;
  precoNegociado?: boolean;
  addonTotem?: boolean;
  cupom?: CupomAtivo | null;
};

function fmt(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export default function PlanoPage() {
  const [data, setData] = useState<PlanoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const load = () => {
    setLoading(true);
    axios
      .get("/api/admin/plano")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Erro ao carregar plano"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const mudarPlano = async (novoPlano: PlanoId) => {
    if (!data || novoPlano === data.planoAtual) return;

    const planoNovo = data.planos.find((p) => p.id === novoPlano);
    if (!planoNovo) return;

    const confirm = window.confirm(
      `Deseja alterar para o plano ${planoNovo.nome} (R$ ${fmt(planoNovo.preco)}/mês)?`
    );
    if (!confirm) return;

    setChanging(true);
    try {
      await axios.put("/api/admin/plano", { plano: novoPlano });
      toast.success(`Plano alterado para ${planoNovo.nome}!`);
      load();
    } catch {
      toast.error("Erro ao alterar plano");
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-text-primary">
        Carregando...
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-text-primary">
        Erro ao carregar dados do plano.
      </div>
    );
  }

  const { planoAtual, planoConfig, billingCycle, uso, calculo, planos, isFilial, addonTotem, cupom } = data;
  const isYearly = billingCycle === "YEARLY";

  return (
    <div className="min-h-screen bg-page text-text-primary p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/perfil"
              className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">Meu Plano</h1>
              <p className="text-sm text-text-muted">
                Gerencie sua assinatura e veja seu consumo
              </p>
            </div>
          </div>
        </div>

        {isFilial && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-300">
            <AlertTriangle size={18} />
            Esta é uma filial. O plano é gerenciado pela empresa matriz.
          </div>
        )}

        {/* Cupom ativo */}
        {cupom && (
          <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-orange-950/30 to-amber-950/40 p-5 shadow-xl shadow-amber-900/20 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">Cupom ativo</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200">
                    {cupom.cupom.codigo}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-amber-100 mt-1">{cupom.cupom.nome}</h3>
                <p className="text-sm text-amber-200/90 mt-0.5">{cupom.resumoTexto}</p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-black/30 border border-amber-500/20 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-amber-300/70">Valor cheio</div>
                    <div className="text-lg font-bold text-text-muted line-through mt-0.5">
                      R$ {fmt(cupom.valorOriginal)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">Você paga</div>
                    <div className="text-lg font-extrabold text-emerald-300 mt-0.5">
                      R$ {fmt(cupom.valorComDesconto)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/30 border border-amber-500/20 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-amber-300/70">Parcelas restantes</div>
                    <div className="text-lg font-bold text-amber-200 mt-0.5">
                      {cupom.parcelasRestantes}
                      <span className="text-sm font-normal text-amber-300/70 ml-1">
                        / {cupom.uso.parcelasMax === 9999 ? '∞' : cupom.uso.parcelasMax}
                      </span>
                    </div>
                  </div>
                </div>

                {cupom.cupom.descricao && (
                  <p className="text-[12px] text-amber-200/70 mt-3 italic">"{cupom.cupom.descricao}"</p>
                )}

                <p className="text-[11px] text-amber-300/70 mt-3">
                  💡 Após {cupom.parcelasRestantes} {cupom.parcelasRestantes === 1 ? 'parcela' : 'parcelas'} com desconto, o valor volta ao normal de <strong>R$ {fmt(cupom.valorOriginal)}/mês</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plano atual + consumo */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* Card plano atual */}
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="size-5 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Plano atual</span>
              </div>
              <span className="rounded-full bg-orb-purple px-3 py-1 text-xs font-bold text-purple-300">
                {planoConfig.nome}
              </span>
            </div>

            <div className="mb-4">
              {cupom ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-text-muted line-through">
                      R$ {fmt(cupom.valorOriginal)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      cupom ativo
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm text-emerald-400">R$</span>
                    <span className="text-3xl font-extrabold text-emerald-300">
                      {fmt(cupom.valorComDesconto).split(",")[0]}
                    </span>
                    <span className="text-lg font-bold text-emerald-300">
                      ,{fmt(cupom.valorComDesconto).split(",")[1]}
                    </span>
                    <span className="text-sm text-text-faint">/mês</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-300/90">
                    Por {cupom.parcelasRestantes} {cupom.parcelasRestantes === 1 ? 'parcela' : 'parcelas'}, depois R$ {fmt(cupom.valorOriginal)}/mês
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-text-muted">R$</span>
                    <span className="text-3xl font-extrabold">
                      {fmt(calculo.total).split(",")[0]}
                    </span>
                    <span className="text-lg font-bold text-text-secondary">
                      ,{fmt(calculo.total).split(",")[1]}
                    </span>
                    <span className="text-sm text-text-faint">
                      /{isYearly ? "ano" : "mês"}
                    </span>
                  </div>
                  {isYearly && (
                    <p className="mt-1 text-xs text-emerald-400">
                      Equivale a R$ {fmt(calculo.totalMensal * 0.9)}/mês (10% de desconto)
                    </p>
                  )}
                  {!calculo.negociado && calculo.total !== calculo.valorBase && !isYearly && (
                    <p className="mt-1 text-xs text-text-faint">
                      Base R$ {fmt(calculo.valorBase)} + excedentes R${" "}
                      {fmt(calculo.extraFunc + calculo.extraAdm + calculo.extraFil)}
                    </p>
                  )}
                </>
              )}
            </div>

            {addonTotem && (
              <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Smartphone size={14} /> Modo Totem ativo
                </div>
                {planoConfig.totemIncluso ? (
                  <p className="mt-1.5 text-[11px] text-text-muted">
                    Incluso no plano <strong className="text-text-primary">{planoConfig.nome}</strong> — sem custo extra.
                  </p>
                ) : calculo.negociado ? (
                  <p className="mt-1.5 text-[11px] text-text-muted">
                    Já incluso no seu preço negociado.
                  </p>
                ) : (
                  <div className="mt-2 space-y-1 text-[11px] text-text-secondary">
                    <div className="flex justify-between">
                      <span>+ Matriz</span>
                      <span className="font-mono">R$ {fmt(planoConfig.totemAddonMatriz)}</span>
                    </div>
                    {uso.filiais > 0 && planoConfig.totemAddonFilial > 0 && (
                      <div className="flex justify-between">
                        <span>+ Filiais ({uso.filiais} × R$ {fmt(planoConfig.totemAddonFilial)})</span>
                        <span className="font-mono">R$ {fmt(planoConfig.totemAddonFilial * uso.filiais)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-purple-500/20 pt-1 font-semibold text-purple-300">
                      <span>Adicional Totem</span>
                      <span className="font-mono">R$ {fmt(calculo.totem)}/mês</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-text-faint">{planoConfig.descricao}</p>
          </div>

          {/* Card consumo */}
          <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface backdrop-blur-sm p-6">
            <h3 className="text-sm font-medium text-text-muted">Consumo atual</h3>

            <div className="space-y-3">
              <ConsumoBar
                icon={<Users size={16} />}
                label="Funcionários"
                atual={uso.funcionarios}
                limite={planoConfig.maxFuncionarios}
              />
              <ConsumoBar
                icon={<UserCog size={16} />}
                label="Administradores"
                atual={uso.admins}
                limite={planoConfig.maxAdmins}
              />
              <ConsumoBar
                icon={<Building2 size={16} />}
                label="Filiais"
                atual={uso.filiais}
                limite={planoConfig.maxFiliais < 0 ? -1 : planoConfig.maxFiliais}
              />
            </div>
          </div>
        </div>

        {/* Lista de planos */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <TrendingUp size={20} className="text-purple-400" />
            Planos disponíveis
          </h2>

          <div className="grid gap-3 md:grid-cols-3">
            {planos.map((p) => {
              const isCurrent = p.id === planoAtual;
              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border p-5 transition-all ${
                    isCurrent
                      ? "border-purple-500/50 bg-purple-950/30 ring-1 ring-purple-500/30"
                      : "border-border-subtle bg-surface hover:border-border-default"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="rounded-full bg-purple-600 px-3 py-0.5 text-[10px] font-bold text-white">
                        ATUAL
                      </span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold">{p.nome}</h3>
                  <p className="mt-1 text-xs text-text-faint">{p.descricao}</p>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold">
                      R$ {fmt(p.preco)}
                    </span>
                    <span className="text-xs text-text-faint">/mês</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-sm text-emerald-400 font-semibold">
                      R$ {fmt(p.precoAnual.anual)}
                    </span>
                    <span className="text-xs text-emerald-400/60">/ano</span>
                    <span className="text-[10px] text-emerald-400/80 ml-1">
                      (R$ {fmt(p.precoAnual.mensalEquivalente)}/mês)
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-text-muted">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400" />
                      Até {p.maxFuncionarios} funcionários
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400" />
                      {p.maxAdmins} admin{p.maxAdmins > 1 ? "s" : ""}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400" />
                      {p.maxFiliais < 0
                        ? "Filiais ilimitadas"
                        : p.maxFiliais === 0
                          ? "Apenas sede"
                          : `Até ${p.maxFiliais} filiais`}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400" />
                      {p.maxFiliais < 0
                        ? "Filial extra: Ilimitadas"
                        : `Filial extra: R$ ${fmt(p.extraFilial)}/cada`}
                    </li>
                    {p.reconhecimentoFacial && (
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400" />
                        Reconhecimento facial
                      </li>
                    )}
                  </ul>

                  <button
                    onClick={() => mudarPlano(p.id)}
                    disabled={isCurrent || changing || isFilial}
                    className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition-all ${
                      isCurrent
                        ? "cursor-default border border-purple-500/30 bg-transparent text-purple-300"
                        : "border border-border-input bg-elevated-solid text-text-primary hover:bg-elevated-solid disabled:opacity-50"
                    }`}
                  >
                    {isCurrent
                      ? "Plano atual"
                      : changing
                        ? "Alterando..."
                        : p.preco > (planos.find((x) => x.id === planoAtual)?.preco ?? 0)
                          ? "Fazer upgrade"
                          : "Alterar plano"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsumoBar({
  icon,
  label,
  atual,
  limite,
}: {
  icon: React.ReactNode;
  label: string;
  atual: number;
  limite: number;
}) {
  const isUnlimited = limite < 0;
  const pct = isUnlimited ? 0 : limite > 0 ? Math.min(100, (atual / limite) * 100) : 0;
  const exceeded = !isUnlimited && atual > limite;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-text-muted">
          {icon}
          {label}
        </span>
        <span className={exceeded ? "font-bold text-amber-400" : "text-text-secondary"}>
          {atual} / {isUnlimited ? "Ilim." : limite}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated-solid">
        <div
          className={`h-full rounded-full transition-all ${
            exceeded
              ? "bg-amber-500"
              : pct >= 80
                ? "bg-amber-400"
                : "bg-purple-500"
          }`}
          style={{ width: `${isUnlimited ? 10 : pct}%` }}
        />
      </div>
      {exceeded && (
        <p className="mt-0.5 text-[10px] text-amber-400">
          {atual - limite} excedente(s) - custo adicional na próxima cobrança
        </p>
      )}
    </div>
  );
}
