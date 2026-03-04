'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Clock, Coffee, AlertCircle, RefreshCw, ArrowLeft, Search, LayoutDashboard, X } from 'lucide-react';

interface FuncionarioStatus {
  id: string;
  nome: string;
  cargo: string;
  foto?: string;
  status: 'TRABALHANDO' | 'PAUSA_OU_SAIU' | 'OFFLINE';
  horarioUltimaAcao?: string;
}

interface Resumo {
  total: number;
  trabalhando: number;
  pausa: number;
  offline: number;
}

type FiltroStatus = 'TODOS' | 'TRABALHANDO' | 'PAUSA_OU_SAIU' | 'OFFLINE';

const INTERVALO_REFRESH = 30; // segundos

const ordemStatus: Record<string, number> = {
  TRABALHANDO: 0,
  PAUSA_OU_SAIU: 1,
  OFFLINE: 2,
};

export default function DashboardPresenca() {
  const [lista, setLista] = useState<FuncionarioStatus[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ total: 0, trabalhando: 0, pausa: 0, offline: 0 });
  const [loading, setLoading] = useState(true);
  const [primeiroLoad, setPrimeiroLoad] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(new Date());
  const [buscaNome, setBuscaNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS');
  const [countdown, setCountdown] = useState(INTERVALO_REFRESH);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/dashboard/agora');
      setLista(res.data.lista);
      setResumo(res.data.resumo);
      setUltimaAtualizacao(new Date());
      setCountdown(INTERVALO_REFRESH);
    } catch (error) {
      console.error('Erro ao atualizar dashboard');
    } finally {
      setLoading(false);
      setPrimeiroLoad(false);
    }
  };

  // Auto-refresh + countdown
  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(carregarDados, INTERVALO_REFRESH * 1000);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? INTERVALO_REFRESH : prev - 1));
    }, 1000);

    return () => {
      clearInterval(intervalo);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const formatarHora = (dataIso?: string) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Lista filtrada + ordenada (trabalhando > pausa > offline)
  const listaFinal = lista
    .filter((func) => {
      if (filtroStatus !== 'TODOS' && func.status !== filtroStatus) return false;
      if (!buscaNome.trim()) return true;
      return (func.nome || '').toLowerCase().includes(buscaNome.trim().toLowerCase());
    })
    .sort((a, b) => (ordemStatus[a.status] ?? 9) - (ordemStatus[b.status] ?? 9));

  const porcentagem = (valor: number) => {
    if (resumo.total === 0) return 0;
    return Math.round((valor / resumo.total) * 100);
  };

  const toggleFiltro = (status: FiltroStatus) => {
    setFiltroStatus((prev) => (prev === status ? 'TODOS' : status));
  };

  // Skeleton loading no primeiro carregamento
  if (primeiroLoad) {
    return (
      <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-8 space-y-8 relative z-10">
          {/* Skeleton header */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-hover-bg rounded-xl animate-pulse" />
            <div className="w-10 h-10 bg-hover-bg rounded-xl animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-7 w-56 bg-hover-bg rounded-lg animate-pulse" />
              <div className="h-4 w-40 bg-hover-bg rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Skeleton cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-5 rounded-2xl border border-border-subtle bg-surface">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 bg-hover-bg rounded-full animate-pulse" />
                  <div className="w-12 h-8 bg-hover-bg rounded-lg animate-pulse" />
                </div>
                <div className="h-3 w-20 bg-hover-bg rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Skeleton list */}
          <div className="bg-surface rounded-2xl border border-border-subtle p-4 space-y-4">
            <div className="h-5 w-40 bg-hover-bg rounded animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="w-12 h-12 bg-hover-bg rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-hover-bg rounded animate-pulse" />
                  <div className="h-3 w-20 bg-hover-bg rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-hover-bg rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-primary relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Orbs decorativos */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orb-purple rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orb-indigo rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto p-4 md:p-8 pb-8 space-y-6 md:space-y-8 relative z-10">

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/admin" className="p-2.5 bg-hover-bg hover:bg-hover-bg-strong text-text-primary rounded-xl border border-border-subtle transition-all active:scale-95" title="Voltar ao Menu">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-hover-bg p-2 rounded-xl border border-border-default">
              <LayoutDashboard size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-text-primary tracking-tight">Visão Geral</h1>
              <p className="text-text-muted text-xs md:text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Atualizado às {ultimaAtualizacao.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <button
            onClick={() => { carregarDados(); setCountdown(INTERVALO_REFRESH); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-hover-bg hover:bg-hover-bg-strong border border-border-subtle rounded-xl text-text-secondary transition-all font-semibold active:scale-95 disabled:opacity-50 group"
            title="Atualizar Agora"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'} />
            <span className="hidden sm:inline">Atualizar</span>
            <span className="text-xs text-text-faint font-mono tabular-nums ml-1">{countdown}s</span>
          </button>
        </div>

        {/* CARDS DE RESUMO — clicáveis para filtrar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          <CardResumo
            icone={<Users size={22} />}
            titulo="Total Equipe"
            valor={resumo.total}
            ativo={filtroStatus === 'TODOS'}
            onClick={() => setFiltroStatus('TODOS')}
            corFundo="bg-surface"
            corBordaAtiva="border-purple-500/40"
            corTexto="text-text-primary"
            corIcone="text-purple-400"
          />
          <CardResumo
            icone={<Clock size={22} />}
            titulo="Trabalhando"
            valor={resumo.trabalhando}
            porcentagem={porcentagem(resumo.trabalhando)}
            ativo={filtroStatus === 'TRABALHANDO'}
            onClick={() => toggleFiltro('TRABALHANDO')}
            corFundo="bg-emerald-500/10"
            corBordaAtiva="border-emerald-500/40"
            corTexto="text-emerald-400"
            corIcone="text-emerald-400"
          />
          <CardResumo
            icone={<Coffee size={22} />}
            titulo="Pausa / Saiu"
            valor={resumo.pausa}
            porcentagem={porcentagem(resumo.pausa)}
            ativo={filtroStatus === 'PAUSA_OU_SAIU'}
            onClick={() => toggleFiltro('PAUSA_OU_SAIU')}
            corFundo="bg-yellow-500/10"
            corBordaAtiva="border-yellow-500/40"
            corTexto="text-yellow-400"
            corIcone="text-yellow-400"
          />
          <CardResumo
            icone={<AlertCircle size={22} />}
            titulo="Offline"
            valor={resumo.offline}
            porcentagem={porcentagem(resumo.offline)}
            ativo={filtroStatus === 'OFFLINE'}
            onClick={() => toggleFiltro('OFFLINE')}
            corFundo="bg-surface"
            corBordaAtiva="border-border-input/40"
            corTexto="text-text-muted"
            corIcone="text-text-faint"
          />
        </div>

        {/* Filtro ativo label */}
        {filtroStatus !== 'TODOS' && (
          <div className="flex items-center gap-2 animate-in fade-in duration-300">
            <span className="text-xs text-text-muted">Filtrando por:</span>
            <button
              onClick={() => setFiltroStatus('TODOS')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-bold border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
            >
              {filtroStatus === 'TRABALHANDO' && 'Trabalhando'}
              {filtroStatus === 'PAUSA_OU_SAIU' && 'Pausa / Saiu'}
              {filtroStatus === 'OFFLINE' && 'Offline'}
              <X size={12} />
            </button>
          </div>
        )}

        {/* LISTA DETALHADA */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
          {/* Barra de busca */}
          <div className="p-3 md:p-4 bg-surface backdrop-blur-sm border border-border-subtle rounded-t-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h3 className="font-bold text-text-secondary text-sm md:text-base">
              Status dos Funcionários
              <span className="ml-2 text-xs text-text-faint font-normal">({listaFinal.length})</span>
            </h3>
            <div className="relative w-full md:w-[320px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
                placeholder="Buscar funcionário..."
                className="w-full bg-input-solid/50 border border-border-default hover:border-white/20 focus:border-purple-500/60 outline-none rounded-xl py-2.5 pl-10 pr-10 text-sm text-text-secondary placeholder:text-text-dim transition-colors"
              />
              {buscaNome.trim() && (
                <button
                  onClick={() => setBuscaNome('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-secondary transition-colors"
                  title="Limpar"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Lista de funcionários — cards individuais no mobile */}
          <div className="bg-surface backdrop-blur-sm rounded-b-2xl border border-border-subtle border-t-0 overflow-hidden">

            {/* Desktop: lista compacta */}
            <div className="hidden md:block divide-y divide-white/5">
              {listaFinal.length === 0 && !loading && (
                <div className="p-8 text-center text-text-faint">
                  {buscaNome.trim()
                    ? `Nenhum funcionário encontrado para "${buscaNome}".`
                    : filtroStatus !== 'TODOS'
                      ? 'Nenhum funcionário neste status.'
                      : 'Nenhum funcionário encontrado.'}
                </div>
              )}

              {listaFinal.map((func) => (
                <div key={func.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {func.foto ? (
                        <Image src={func.foto} width={44} height={44} className="w-11 h-11 rounded-full object-cover border border-border-default" alt={func.nome} />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-elevated-solid flex items-center justify-center border border-border-default">
                          <Users size={18} className="text-text-faint" />
                        </div>
                      )}
                      <StatusDot status={func.status} />
                    </div>

                    <div>
                      <h4 className="font-semibold text-text-primary text-sm">{func.nome}</h4>
                      <p className="text-xs text-text-faint uppercase">{func.cargo}</p>
                    </div>
                  </div>

                  <StatusBadge status={func.status} hora={formatarHora(func.horarioUltimaAcao)} />
                </div>
              ))}
            </div>

            {/* Mobile: cards individuais */}
            <div className="md:hidden p-3 space-y-2">
              {listaFinal.length === 0 && !loading && (
                <div className="p-6 text-center text-text-faint text-sm">
                  {buscaNome.trim()
                    ? `Nenhum resultado para "${buscaNome}".`
                    : filtroStatus !== 'TODOS'
                      ? 'Nenhum funcionário neste status.'
                      : 'Nenhum funcionário encontrado.'}
                </div>
              )}

              {listaFinal.map((func) => (
                <div
                  key={func.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    func.status === 'TRABALHANDO'
                      ? 'bg-emerald-500/5 border-emerald-500/10'
                      : func.status === 'PAUSA_OU_SAIU'
                        ? 'bg-yellow-500/5 border-yellow-500/10'
                        : 'bg-white/[0.02] border-border-subtle'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {func.foto ? (
                        <Image src={func.foto} width={44} height={44} className="w-11 h-11 rounded-full object-cover border border-border-default" alt={func.nome} />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-elevated-solid flex items-center justify-center border border-border-default">
                          <Users size={18} className="text-text-faint" />
                        </div>
                      )}
                      <StatusDot status={func.status} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-text-primary text-sm truncate">{func.nome}</h4>
                      <p className="text-[11px] text-text-faint uppercase truncate">{func.cargo}</p>
                    </div>

                    <StatusBadge status={func.status} hora={formatarHora(func.horarioUltimaAcao)} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ===== Componentes auxiliares ===== */

function StatusDot({ status }: { status: string }) {
  return (
    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0f172a]
      ${status === 'TRABALHANDO' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' :
        status === 'PAUSA_OU_SAIU' ? 'bg-yellow-500' : 'bg-slate-600'}`}
    />
  );
}

function StatusBadge({ status, hora, compact }: { status: string; hora: string; compact?: boolean }) {
  if (status === 'TRABALHANDO') {
    return (
      <div className={`flex flex-col ${compact ? 'items-end' : 'items-end'}`}>
        <span className="text-[10px] md:text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 md:py-1 rounded-lg">EM SERVIÇO</span>
        <span className="text-[10px] md:text-xs text-text-faint mt-0.5">Entrou {hora}</span>
      </div>
    );
  }
  if (status === 'PAUSA_OU_SAIU') {
    return (
      <div className="flex flex-col items-end">
        <span className="text-[10px] md:text-xs font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 md:py-1 rounded-lg">PAUSA / SAIU</span>
        <span className="text-[10px] md:text-xs text-text-faint mt-0.5">Último {hora}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] md:text-xs font-bold bg-border-input/50 text-text-faint px-2 py-0.5 md:py-1 rounded-lg">OFFLINE</span>
      <span className="text-[10px] md:text-xs text-text-dim mt-0.5">Sem registro</span>
    </div>
  );
}

function CardResumo({
  icone, titulo, valor, porcentagem, ativo, onClick,
  corFundo, corBordaAtiva, corTexto, corIcone,
}: {
  icone: React.ReactNode;
  titulo: string;
  valor: number;
  porcentagem?: number;
  ativo: boolean;
  onClick: () => void;
  corFundo: string;
  corBordaAtiva: string;
  corTexto: string;
  corIcone: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 md:p-5 rounded-2xl border backdrop-blur-sm text-left transition-all active:scale-[0.97] cursor-pointer group
        ${corFundo}
        ${ativo ? `${corBordaAtiva} ring-1 ring-white/5 shadow-lg` : 'border-border-subtle hover:border-border-default'}`}
    >
      <div className="flex justify-between items-start mb-1.5 md:mb-2">
        <div className={`${corIcone} opacity-80 group-hover:opacity-100 transition-opacity`}>{icone}</div>
        <span className={`text-2xl md:text-3xl font-bold ${corTexto} tabular-nums`}>{valor}</span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-text-muted text-[10px] md:text-xs font-medium uppercase">{titulo}</p>
        {porcentagem !== undefined && valor > 0 && (
          <span className={`text-[10px] font-bold ${corTexto} opacity-60`}>{porcentagem}%</span>
        )}
      </div>
    </button>
  );
}
