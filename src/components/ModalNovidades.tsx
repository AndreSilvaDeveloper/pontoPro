'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Clock, Bell, BarChart3, FileText, CheckSquare, Calendar, TrendingUp, AlertTriangle, Coffee, UtensilsCrossed, ExternalLink, Scale, Timer, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePromptStatus } from '@/hooks/usePromptStatus';

const VERSAO_NOVIDADES = 'v3.0.0';

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
    icon: Shield,
    cor: 'text-red-400',
    bg: 'bg-red-500/10',
    titulo: 'Controle de Horas Extras',
    descricao: 'O sistema agora detecta automaticamente horas extras e cria pendências para você aprovar ou rejeitar. Sem aprovação, a hora extra não conta no banco.',
    link: '/admin/solicitacoes',
  },
  {
    icon: Users,
    cor: 'text-purple-400',
    bg: 'bg-purple-500/10',
    titulo: 'Banco de Horas da Equipe',
    descricao: 'Veja o saldo de banco de horas de todos os funcionários em um só lugar. Filtre por mês ou veja o acumulado. O cálculo considera até o dia anterior para evitar valores parciais.',
  },
  {
    icon: Scale,
    cor: 'text-blue-400',
    bg: 'bg-blue-500/10',
    titulo: 'Gerenciar Horas Extras',
    descricao: 'Pague horas extras em dinheiro, dê folga como compensação ou faça correções manuais. Selecione vários funcionários de uma vez. Tudo fica registrado na auditoria.',
  },
  {
    icon: Timer,
    cor: 'text-orange-400',
    bg: 'bg-orange-500/10',
    titulo: 'Aprovação de Horas Extras',
    descricao: 'Na tela de Pendências, uma nova aba "Horas Extras" mostra todas as horas extras pendentes com detalhes de meta, trabalhado e extra. Aprove individualmente ou em lote.',
    link: '/admin/solicitacoes',
  },
  {
    icon: Bell,
    cor: 'text-amber-400',
    bg: 'bg-amber-500/10',
    titulo: 'Push de Horas Extras',
    descricao: 'Você recebe notificação push quando há horas extras pendentes de aprovação. Nada passa despercebido.',
  },
  {
    icon: Calendar,
    cor: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    titulo: 'Filtro por Tipo de Registro',
    descricao: 'Novo filtro na tabela de pontos: veja apenas entradas, saídas, almoços ou todos os registros de uma vez.',
  },
];

const novidadesFuncionario: Novidade[] = [
  {
    icon: Shield,
    cor: 'text-red-400',
    bg: 'bg-red-500/10',
    titulo: 'Horas Extras Controladas',
    descricao: 'Suas horas extras agora precisam da aprovação do gestor para contar no banco. Isso garante que o saldo está sempre correto.',
  },
  {
    icon: Scale,
    cor: 'text-purple-400',
    bg: 'bg-purple-500/10',
    titulo: 'Ajustes no Histórico',
    descricao: 'Pagamentos de horas extras, folgas de compensação e correções do gestor agora aparecem direto no seu histórico de pontos.',
    link: '/funcionario/historico',
  },
  {
    icon: Clock,
    cor: 'text-blue-400',
    bg: 'bg-blue-500/10',
    titulo: 'Progresso do Dia',
    descricao: 'Barra de progresso mostrando quanto já trabalhou e quanto falta para completar sua jornada.',
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
    cor: 'text-amber-400',
    bg: 'bg-amber-500/10',
    titulo: 'Notificações',
    descricao: 'Receba notificações push e email sobre aprovações, rejeições e lembretes de pausa.',
  },
];

export default function ModalNovidades({ tipo }: Props) {
  const [aberto, setAberto] = useState(false);
  const { status, loading: statusLoading, markSeen } = usePromptStatus();
  const router = useRouter();

  // Espera os prompts terminarem para abrir automaticamente
  useEffect(() => {
    if (statusLoading || !status) return;

    // Já viu esta versão no banco
    if (status.novidadesVisto === VERSAO_NOVIDADES) {
      (window as any).__novidadesDone = true; window.dispatchEvent(new Event('novidades-done'));
      return;
    }

    const w = window as any;
    let promptsReady = !!w.__promptsReady;
    let pushDone = !!w.__pushDone;
    let installDone = !!w.__installDone;
    let cadastroOk = !!w.__cadastroCompleto;

    const tentarAbrir = () => {
      if (promptsReady && pushDone && installDone && cadastroOk) {
        setTimeout(() => setAberto(true), 500);
      }
    };

    // Checa se já resolveram antes
    if (promptsReady && pushDone && installDone && cadastroOk) {
      tentarAbrir();
      return;
    }

    const onReady = () => { promptsReady = true; tentarAbrir(); };
    const onPushDone = () => { pushDone = true; tentarAbrir(); };
    const onInstallDone = () => { installDone = true; tentarAbrir(); };
    const onCadastro = () => { cadastroOk = true; w.__cadastroCompleto = true; tentarAbrir(); };

    window.addEventListener('prompts-ready', onReady);
    window.addEventListener('push-prompt-done', onPushDone);
    window.addEventListener('install-prompt-done', onInstallDone);
    window.addEventListener('cadastro-completo', onCadastro);

    // Fallback: se os eventos não dispararem em 8s, abre o modal mesmo assim
    const fallback = setTimeout(() => {
      promptsReady = true; pushDone = true; installDone = true; cadastroOk = true;
      tentarAbrir();
    }, 8000);

    return () => {
      clearTimeout(fallback);
      window.removeEventListener('prompts-ready', onReady);
      window.removeEventListener('push-prompt-done', onPushDone);
      window.removeEventListener('install-prompt-done', onInstallDone);
      window.removeEventListener('cadastro-completo', onCadastro);
    };
  }, [statusLoading, status]);

  const fechar = () => {
    setAberto(false);
    markSeen('novidadesVisto', VERSAO_NOVIDADES);
    window.dispatchEvent(new Event('novidades-done'));
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
