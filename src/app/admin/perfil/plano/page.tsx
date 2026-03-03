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
} from "lucide-react";
import type { PlanoConfig, PlanoId } from "@/config/planos";

type PlanoData = {
  ok: boolean;
  planoAtual: PlanoId;
  planoConfig: PlanoConfig;
  uso: { funcionarios: number; admins: number; filiais: number };
  calculo: {
    valorBase: number;
    extraFunc: number;
    extraAdm: number;
    extraFil: number;
    total: number;
  };
  planos: PlanoConfig[];
  isFilial: boolean;
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando...
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Erro ao carregar dados do plano.
      </div>
    );
  }

  const { planoAtual, planoConfig, uso, calculo, planos, isFilial } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/perfil"
              className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Meu Plano</h1>
              <p className="text-sm text-slate-400">
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

        {/* Plano atual + consumo */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Card plano atual */}
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="size-5 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Plano atual</span>
              </div>
              <span className="rounded-full bg-purple-600/20 px-3 py-1 text-xs font-bold text-purple-300">
                {planoConfig.nome}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-slate-400">R$</span>
                <span className="text-3xl font-extrabold">
                  {fmt(calculo.total).split(",")[0]}
                </span>
                <span className="text-lg font-bold text-slate-300">
                  ,{fmt(calculo.total).split(",")[1]}
                </span>
                <span className="text-sm text-slate-500">/mês</span>
              </div>
              {calculo.total !== calculo.valorBase && (
                <p className="mt-1 text-xs text-slate-500">
                  Base R$ {fmt(calculo.valorBase)} + excedentes R${" "}
                  {fmt(calculo.extraFunc + calculo.extraAdm + calculo.extraFil)}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500">{planoConfig.descricao}</p>
          </div>

          {/* Card consumo */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-sm font-medium text-slate-400">Consumo atual</h3>

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

          <div className="grid gap-4 md:grid-cols-3">
            {planos.map((p) => {
              const isCurrent = p.id === planoAtual;
              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border p-5 transition-all ${
                    isCurrent
                      ? "border-purple-500/50 bg-purple-950/30 ring-1 ring-purple-500/30"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
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
                  <p className="mt-1 text-xs text-slate-500">{p.descricao}</p>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold">
                      R$ {fmt(p.preco)}
                    </span>
                    <span className="text-xs text-slate-500">/mês</span>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-slate-400">
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
                        : "border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
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
        <span className="flex items-center gap-1.5 text-slate-400">
          {icon}
          {label}
        </span>
        <span className={exceeded ? "font-bold text-amber-400" : "text-slate-300"}>
          {atual} / {isUnlimited ? "Ilim." : limite}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
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
