'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X, Sparkles, ArrowRight, Users, Settings, Clock } from 'lucide-react';

interface Props {
  empresaTemDados: boolean;
  temFuncionario: boolean;
  temPonto: boolean;
}

const STORAGE_KEY = 'workid_wizard_dismissed_v1';

export default function OnboardingWizard({ empresaTemDados, temFuncionario, temPonto }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
    }
  }, []);

  if (!mounted) return null;

  const steps = [
    {
      done: empresaTemDados,
      icon: Settings,
      title: 'Configure sua empresa',
      desc: 'Preencha nome, CNPJ e as regras de ponto.',
      cta: 'Ir para configurações',
      href: '/admin/configuracoes',
    },
    {
      done: temFuncionario,
      icon: Users,
      title: 'Cadastre seu primeiro funcionário',
      desc: 'Adicione alguém da equipe (ou você mesmo para testar).',
      cta: 'Ir para Gestão da Equipe',
      href: '/admin/funcionarios',
    },
    {
      done: temPonto,
      icon: Clock,
      title: 'Aguarde o primeiro ponto',
      desc: 'Peça ao funcionário para instalar o app e bater o ponto. Ele aparece aqui em tempo real.',
      cta: null,
      href: null,
    },
  ];

  const totalDone = steps.filter(s => s.done).length;
  const total = steps.length;
  const todosFeitos = totalDone === total;
  const progresso = Math.round((totalDone / total) * 100);

  if (dismissed || todosFeitos) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-indigo-950/20 to-purple-950/40 backdrop-blur-sm p-5 md:p-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-text-dim hover:text-text-primary hover:bg-hover-bg transition-colors z-10"
        title="Dispensar"
      >
        <X size={16} />
      </button>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-purple-300">
            Bem-vindo ao WorkID
          </span>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-1">
          Vamos deixar tudo pronto em 3 passos
        </h2>
        <p className="text-sm text-text-muted mb-4">
          {totalDone}/{total} concluídos · {progresso}%
        </p>

        {/* Barra de progresso */}
        <div className="h-1.5 bg-elevated rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-700"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Passos */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors ${
                  step.done
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-surface/40 border-border-subtle'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {step.done ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <Circle size={20} className="text-text-dim" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={step.done ? 'text-emerald-400' : 'text-purple-400'} />
                    <h3 className={`text-sm font-bold ${step.done ? 'text-emerald-300 line-through opacity-70' : 'text-text-primary'}`}>
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{step.desc}</p>
                </div>

                {step.cta && step.href && !step.done && (
                  <Link
                    href={step.href}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                  >
                    {step.cta}
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
