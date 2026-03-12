'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Clock, Bell, BarChart3, FileText, CheckSquare, Calendar, TrendingUp, AlertTriangle, Coffee, UtensilsCrossed, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

const VERSAO_NOVIDADES = 'v2.5.0';

interface Novidade {
  icon: any;
  cor: string;
  bg: string;
  titulo: string;
  descricao: string;
  link?: string;
}

interface Props {
  tipo: 'ADMIN' | 'FUNCIONARIO';
}

const novidadesAdmin: Novidade[] = [
  {
    icon: AlertTriangle,
    cor: 'text-red-400',
    bg: 'bg-red-500/10',
    titulo: 'Alertas Inteligentes',
    descricao: 'Atrasos, ausências sem justificativa, hora extra excessiva e padrões recorrentes — tudo na Visão Geral.',
    link: '/admin/dashboard',
  },
  {
    icon: BarChart3,
    cor: 'text-purple-400',
    bg: 'bg-purple-500/10',
    titulo: 'Gráfico de Tendências',
    descricao: 'Veja a presença da equipe nas últimas 4 semanas com gráfico e resumo semanal.',
    link: '/admin/dashboard',
  },
  {
    icon: FileText,
    cor: 'text-blue-400',
    bg: 'bg-blue-500/10',
    titulo: 'Folha de Ponto',
    descricao: 'Relatório por período personalizado com exportação PDF, pronto para enviar ao contador.',
    link: '/admin/relatorio-mensal',
  },
  {
    icon: CheckSquare,
    cor: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    titulo: 'Aprovação em Lote',
    descricao: 'Selecione várias solicitações e aprove ou rejeite todas de uma vez.',
    link: '/admin/solicitacoes',
  },
  {
    icon: Bell,
    cor: 'text-amber-400',
    bg: 'bg-amber-500/10',
    titulo: 'Notificações por Email',
    descricao: 'Receba email quando um funcionário criar uma solicitação. Funcionários são notificados quando você aprovar ou rejeitar.',
  },
  {
    icon: TrendingUp,
    cor: 'text-orange-400',
    bg: 'bg-orange-500/10',
    titulo: 'Relatório Diário Automático',
    descricao: 'Todo dia às 19h você recebe por email o resumo: faltas, atrasos, hora extra e saídas antecipadas.',
  },
];

const novidadesFuncionario: Novidade[] = [
  {
    icon: Clock,
    cor: 'text-purple-400',
    bg: 'bg-purple-500/10',
    titulo: 'Progresso do Dia',
    descricao: 'Agora você vê uma barra mostrando quanto já trabalhou e quanto falta para completar sua jornada.',
  },
  {
    icon: TrendingUp,
    cor: 'text-blue-400',
    bg: 'bg-blue-500/10',
    titulo: 'Previsão de Saída',
    descricao: 'O sistema calcula automaticamente seu horário previsto de saída baseado na sua entrada.',
  },
  {
    icon: Coffee,
    cor: 'text-amber-400',
    bg: 'bg-amber-500/10',
    titulo: 'Alerta de Café',
    descricao: 'Receba um aviso quando sua pausa para café ultrapassar 15 minutos.',
  },
  {
    icon: UtensilsCrossed,
    cor: 'text-orange-400',
    bg: 'bg-orange-500/10',
    titulo: 'Alerta de Almoço',
    descricao: 'Aviso quando seu horário de almoço exceder o tempo configurado.',
  },
  {
    icon: Calendar,
    cor: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    titulo: 'Calendário no Histórico',
    descricao: 'Visualize seu mês com cores: verde (OK), vermelho (falta), amarelo (parcial). Clique no dia para filtrar.',
    link: '/funcionario/historico',
  },
  {
    icon: Bell,
    cor: 'text-red-400',
    bg: 'bg-red-500/10',
    titulo: 'Email de Aprovação',
    descricao: 'Agora você recebe um email quando sua solicitação de ajuste é aprovada ou rejeitada.',
  },
];

export default function ModalNovidades({ tipo }: Props) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  const storageKey = `novidades_visto_${tipo}_${VERSAO_NOVIDADES}`;

  useEffect(() => {
    const jaViu = localStorage.getItem(storageKey);
    if (!jaViu) {
      const timer = setTimeout(() => setAberto(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const fechar = () => {
    localStorage.setItem(storageKey, 'true');
    setAberto(false);
  };

  const irPara = (link: string) => {
    fechar();
    router.push(link);
  };

  if (!aberto) return null;

  const novidades = tipo === 'ADMIN' ? novidadesAdmin : novidadesFuncionario;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={fechar} />

      <div className="relative z-10 w-full max-w-md bg-page border border-border-default shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-300 max-h-[85dvh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Novidades!</h2>
              <p className="text-white/70 text-xs">Confira o que há de novo no sistema</p>
            </div>
          </div>
          <button onClick={fechar} className="text-white/60 hover:text-white p-1 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Lista de novidades */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {novidades.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle hover:bg-hover-bg transition-colors animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className={`${item.bg} p-2 rounded-xl shrink-0`}>
                  <Icon size={18} className={item.cor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary">{item.titulo}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{item.descricao}</p>
                  {item.link && (
                    <button
                      onClick={() => irPara(item.link!)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Ver no sistema <ExternalLink size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle shrink-0">
          <button
            onClick={fechar}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg"
          >
            Entendi!
          </button>
        </div>
      </div>
    </div>
  );
}
