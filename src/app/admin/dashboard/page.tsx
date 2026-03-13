'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Clock, Coffee, AlertCircle, RefreshCw, ArrowLeft, Search, LayoutDashboard, X, UtensilsCrossed, LogOut, Timer, AlertTriangle, UserX, Hourglass, ChevronDown, ChevronUp, BarChart3, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface FuncionarioStatus {
  id: string;
  nome: string;
  cargo: string;
  foto?: string;
  status: 'TRABALHANDO' | 'ALMOCO' | 'CAFE' | 'CAFE_EXCEDIDO' | 'ENCERROU' | 'OFFLINE';
  statusLabel: string;
  tempoNoStatus: number; // minutos
  horaEntrada: string | null;
  horarioUltimaAcao: string | null;
  minutosTrabalhadosHoje: number;
  totalPontos: number;
}

interface Resumo {
  total: number;
  trabalhando: number;
  almoco: number;
  cafe: number;
  encerrou: number;
  offline: number;
}

type FiltroStatus = 'TODOS' | 'TRABALHANDO' | 'ALMOCO' | 'CAFE' | 'ENCERROU' | 'OFFLINE';

const INTERVALO_REFRESH = 30; // segundos

const ordemStatus: Record<string, number> = {
  TRABALHANDO: 0,
  CAFE: 1,
  CAFE_EXCEDIDO: 1,
  ALMOCO: 2,
  ENCERROU: 3,
  OFFLINE: 4,
};

function formatarTempo(minutos: number): string {
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function formatarHorasTrabalhadas(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export default function DashboardPresenca() {
  const [lista, setLista] = useState<FuncionarioStatus[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ total: 0, trabalhando: 0, almoco: 0, cafe: 0, encerrou: 0, offline: 0 });
  const [loading, setLoading] = useState(true);
  const [primeiroLoad, setPrimeiroLoad] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(new Date());
  const [buscaNome, setBuscaNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS');
  const [countdown, setCountdown] = useState(INTERVALO_REFRESH);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [tempoExtra, setTempoExtra] = useState(0); // segundos extras desde última atualização
  const [alertas, setAlertas] = useState<any[]>([]);
  const [resumoAlertas, setResumoAlertas] = useState({ atrasos: 0, ausenciasSemJustificativa: 0, horaExtra: 0, saiuCedo: 0, padroesAtraso: 0 });
  const [alertasAberto, setAlertasAberto] = useState(false);
  const [tendencias, setTendencias] = useState<any>(null);
  const [tendenciasAberto, setTendenciasAberto] = useState(true);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [res, resAlertas, resTendencias] = await Promise.all([
        axios.get('/api/admin/dashboard/agora'),
        axios.get('/api/admin/dashboard/alertas').catch(() => ({ data: { alertas: [], resumo: { atrasos: 0, ausenciasSemJustificativa: 0, horaExtra: 0, saiuCedo: 0, padroesAtraso: 0 } } })),
        axios.get('/api/admin/dashboard/tendencias').catch(() => ({ data: null })),
      ]);
      setLista(res.data.lista);
      setResumo(res.data.resumo);
      setAlertas(resAlertas.data.alertas || []);
      setResumoAlertas(resAlertas.data.resumo || { atrasos: 0, ausenciasSemJustificativa: 0, horaExtra: 0, saiuCedo: 0 });
      setTendencias(resTendencias.data);
      setUltimaAtualizacao(new Date());
      setCountdown(INTERVALO_REFRESH);
      setTempoExtra(0);
    } catch (error) {
      console.error('Erro ao atualizar dashboard');
    } finally {
      setLoading(false);
      setPrimeiroLoad(false);
    }
  };

  // Auto-refresh + countdown + timer
  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(carregarDados, INTERVALO_REFRESH * 1000);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? INTERVALO_REFRESH : prev - 1));
      setTempoExtra((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(intervalo);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const formatarHora = (dataIso?: string | null) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Tempo atualizado em tempo real (tempoNoStatus da API + segundos extras)
  const tempoAtualizado = (tempoNoStatusMinutos: number) => {
    const totalMinutos = tempoNoStatusMinutos + Math.floor(tempoExtra / 60);
    return formatarTempo(totalMinutos);
  };

  // Lista filtrada + ordenada
  const listaFinal = lista
    .filter((func) => {
      if (filtroStatus === 'CAFE' && func.status !== 'CAFE' && func.status !== 'CAFE_EXCEDIDO') return false;
      if (filtroStatus !== 'TODOS' && filtroStatus !== 'CAFE' && func.status !== filtroStatus) return false;
      if (filtroStatus === 'TODOS' || filtroStatus === 'CAFE') {
        // OK
      }
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
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-hover-bg rounded-xl animate-pulse" />
            <div className="w-10 h-10 bg-hover-bg rounded-xl animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-7 w-56 bg-hover-bg rounded-lg animate-pulse" />
              <div className="h-4 w-40 bg-hover-bg rounded-lg animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-5 rounded-2xl border border-border-subtle bg-surface">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 bg-hover-bg rounded-full animate-pulse" />
                  <div className="w-12 h-8 bg-hover-bg rounded-lg animate-pulse" />
                </div>
                <div className="h-3 w-20 bg-hover-bg rounded animate-pulse" />
              </div>
            ))}
          </div>

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

          <div className="flex items-center gap-2">
            <Link
              href="/admin/relatorio-mensal"
              className="flex items-center gap-2 px-4 py-2.5 bg-hover-bg hover:bg-hover-bg-strong border border-border-subtle rounded-xl text-text-secondary transition-all font-semibold active:scale-95 group"
              title="Folha de Ponto Mensal"
            >
              <FileText size={18} className="group-hover:text-purple-400 transition-colors" />
              <span className="hidden sm:inline">Folha Mensal</span>
            </Link>
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
        </div>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          <CardResumo
            icone={<Users size={20} />}
            titulo="Equipe"
            valor={resumo.total}
            ativo={filtroStatus === 'TODOS'}
            onClick={() => setFiltroStatus('TODOS')}
            corFundo="bg-surface"
            corBordaAtiva="border-purple-500/40"
            corTexto="text-text-primary"
            corIcone="text-purple-400"
          />
          <CardResumo
            icone={<Clock size={20} />}
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
            icone={<UtensilsCrossed size={20} />}
            titulo="Almoço"
            valor={resumo.almoco}
            porcentagem={porcentagem(resumo.almoco)}
            ativo={filtroStatus === 'ALMOCO'}
            onClick={() => toggleFiltro('ALMOCO')}
            corFundo="bg-orange-500/10"
            corBordaAtiva="border-orange-500/40"
            corTexto="text-orange-400"
            corIcone="text-orange-400"
          />
          <CardResumo
            icone={<Coffee size={20} />}
            titulo="Café"
            valor={resumo.cafe}
            porcentagem={porcentagem(resumo.cafe)}
            ativo={filtroStatus === 'CAFE'}
            onClick={() => toggleFiltro('CAFE')}
            corFundo="bg-yellow-500/10"
            corBordaAtiva="border-yellow-500/40"
            corTexto="text-yellow-400"
            corIcone="text-yellow-400"
          />
          <CardResumo
            icone={<LogOut size={20} />}
            titulo="Encerrou"
            valor={resumo.encerrou}
            porcentagem={porcentagem(resumo.encerrou)}
            ativo={filtroStatus === 'ENCERROU'}
            onClick={() => toggleFiltro('ENCERROU')}
            corFundo="bg-blue-500/10"
            corBordaAtiva="border-blue-500/40"
            corTexto="text-blue-400"
            corIcone="text-blue-400"
          />
          <CardResumo
            icone={<AlertCircle size={20} />}
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

        {/* ALERTAS */}
        {alertas.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '150ms' }}>
            <button
              onClick={() => setAlertasAberto(!alertasAberto)}
              className="w-full flex items-center justify-between bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-2xl p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-xl">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-red-400">
                    {alertas.length} {alertas.length === 1 ? 'Alerta' : 'Alertas'}
                  </p>
                  <p className="text-[11px] text-red-400/60">
                    {[
                      resumoAlertas.atrasos > 0 && `${resumoAlertas.atrasos} atraso${resumoAlertas.atrasos > 1 ? 's' : ''}`,
                      resumoAlertas.ausenciasSemJustificativa > 0 && `${resumoAlertas.ausenciasSemJustificativa} falta${resumoAlertas.ausenciasSemJustificativa > 1 ? 's' : ''}`,
                      resumoAlertas.horaExtra > 0 && `${resumoAlertas.horaExtra} com hora extra`,
                      resumoAlertas.saiuCedo > 0 && `${resumoAlertas.saiuCedo} saiu cedo`,
                      resumoAlertas.padroesAtraso > 0 && `${resumoAlertas.padroesAtraso} atraso${resumoAlertas.padroesAtraso > 1 ? 's' : ''} recorrente${resumoAlertas.padroesAtraso > 1 ? 's' : ''}`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {alertasAberto ? <ChevronUp size={18} className="text-red-400/60" /> : <ChevronDown size={18} className="text-red-400/60" />}
            </button>

            {alertasAberto && (
              <div className="mt-2 space-y-2">
                {alertas.map((alerta: any, idx: number) => (
                  <AlertaItem key={idx} alerta={alerta} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filtro ativo label */}
        {filtroStatus !== 'TODOS' && (
          <div className="flex items-center gap-2 animate-in fade-in duration-300">
            <span className="text-xs text-text-muted">Filtrando por:</span>
            <button
              onClick={() => setFiltroStatus('TODOS')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-bold border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
            >
              {{
                TRABALHANDO: 'Trabalhando',
                ALMOCO: 'Almoço',
                CAFE: 'Café',
                ENCERROU: 'Encerrou',
                OFFLINE: 'Offline',
              }[filtroStatus]}
              <X size={12} />
            </button>
          </div>
        )}

        {/* LISTA DETALHADA */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '175ms' }}>
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

          {/* Lista de funcionários */}
          <div className="bg-surface backdrop-blur-sm rounded-b-2xl border border-border-subtle border-t-0 overflow-hidden">

            {/* Desktop */}
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

                  {/* Info central: horas trabalhadas e entrada */}
                  {func.status !== 'OFFLINE' && (
                    <div className="flex items-center gap-6 text-xs text-text-muted">
                      {func.horaEntrada && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-text-faint" />
                          <span>Entrada {formatarHora(func.horaEntrada)}</span>
                        </div>
                      )}
                      {func.minutosTrabalhadosHoje > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Timer size={13} className="text-text-faint" />
                          <span>{formatarHorasTrabalhadas(func.minutosTrabalhadosHoje)} trabalhadas</span>
                        </div>
                      )}
                    </div>
                  )}

                  <StatusBadge status={func.status} statusLabel={func.statusLabel} tempo={tempoAtualizado(func.tempoNoStatus)} />
                </div>
              ))}
            </div>

            {/* Mobile */}
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
                  className={`p-3.5 rounded-xl border transition-colors ${getCardBg(func.status)}`}
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

                    <StatusBadge status={func.status} statusLabel={func.statusLabel} tempo={tempoAtualizado(func.tempoNoStatus)} compact />
                  </div>

                  {/* Info extra mobile */}
                  {func.status !== 'OFFLINE' && (func.horaEntrada || func.minutosTrabalhadosHoje > 0) && (
                    <div className="flex items-center gap-4 mt-2 ml-14 text-[11px] text-text-muted">
                      {func.horaEntrada && (
                        <span>Entrada: {formatarHora(func.horaEntrada)}</span>
                      )}
                      {func.minutosTrabalhadosHoje > 0 && (
                        <span>Trabalhado: {formatarHorasTrabalhadas(func.minutosTrabalhadosHoje)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TENDÊNCIAS */}
        {tendencias?.dias?.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '250ms' }}>
            <button
              onClick={() => setTendenciasAberto(!tendenciasAberto)}
              className="w-full flex items-center justify-between bg-surface hover:bg-hover-bg border border-border-subtle rounded-2xl p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 p-2 rounded-xl">
                  <BarChart3 size={20} className="text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-text-primary">
                    Tendências (últimas 4 semanas)
                  </p>
                  <p className="text-[11px] text-text-faint">
                    Presença, ausências e atrasos por dia
                  </p>
                </div>
              </div>
              {tendenciasAberto ? <ChevronUp size={18} className="text-text-faint" /> : <ChevronDown size={18} className="text-text-faint" />}
            </button>

            {tendenciasAberto && (
              <div className="mt-2 space-y-4">
                {/* Gráfico de Área */}
                <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-4 md:p-6">
                  <div className="w-full h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={tendencias.dias.map((d: any) => ({
                        ...d,
                        label: `${d.data.split('-')[2]}/${d.data.split('-')[1]}`,
                      }))}>
                        <defs>
                          <linearGradient id="gradPresentes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradAusentes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          axisLine={{ stroke: '#334155' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#e2e8f0',
                          }}
                          labelFormatter={(label: string) => `Dia ${label}`}
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = { presentes: 'Presentes', ausentes: 'Ausentes' };
                            return [value, labels[name] || name];
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="presentes"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#gradPresentes)"
                          name="presentes"
                        />
                        <Area
                          type="monotone"
                          dataKey="ausentes"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill="url(#gradAusentes)"
                          name="ausentes"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>Presentes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>Ausentes</span>
                    </div>
                  </div>
                </div>

                {/* Resumo semanal */}
                {tendencias.semanas?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {tendencias.semanas.map((sem: any, idx: number) => (
                      <div key={idx} className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-4">
                        <p className="text-xs text-text-faint font-medium mb-3">{sem.semana}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">Presenças</span>
                            <span className="text-sm font-bold text-emerald-400">{sem.presentes}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">Ausências</span>
                            <span className="text-sm font-bold text-red-400">{sem.ausentes}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">Atrasos</span>
                            <span className="text-sm font-bold text-amber-400">{sem.atrasados}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-border-subtle pt-2 mt-2">
                            <span className="text-xs text-text-muted">Média/dia</span>
                            <span className="text-sm font-bold text-purple-400">{sem.mediaHorasDia}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ===== Componentes auxiliares ===== */

function getCardBg(status: string): string {
  switch (status) {
    case 'TRABALHANDO': return 'bg-emerald-500/5 border-emerald-500/10';
    case 'ALMOCO': return 'bg-orange-500/5 border-orange-500/10';
    case 'CAFE': return 'bg-yellow-500/5 border-yellow-500/10';
    case 'CAFE_EXCEDIDO': return 'bg-red-500/5 border-red-500/10';
    case 'ENCERROU': return 'bg-blue-500/5 border-blue-500/10';
    default: return 'bg-white/[0.02] border-border-subtle';
  }
}

function StatusDot({ status }: { status: string }) {
  const cor = {
    TRABALHANDO: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
    ALMOCO: 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]',
    CAFE: 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]',
    CAFE_EXCEDIDO: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
    ENCERROU: 'bg-blue-500',
    OFFLINE: 'bg-slate-600',
  }[status] || 'bg-slate-600';

  return (
    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0f172a] ${cor}`} />
  );
}

function StatusBadge({ status, statusLabel, tempo, compact }: { status: string; statusLabel: string; tempo: string; compact?: boolean }) {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    TRABALHANDO: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'EM SERVIÇO' },
    ALMOCO: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'ALMOÇO' },
    CAFE: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'CAFÉ' },
    CAFE_EXCEDIDO: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'CAFÉ EXCEDIDO' },
    ENCERROU: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'ENCERROU' },
    OFFLINE: { bg: 'bg-border-input/50', text: 'text-text-faint', label: 'OFFLINE' },
  };

  const cfg = configs[status] || configs.OFFLINE;

  if (status === 'OFFLINE') {
    return (
      <div className="flex flex-col items-end">
        <span className={`text-[10px] md:text-xs font-bold ${cfg.bg} ${cfg.text} px-2 py-0.5 md:py-1 rounded-lg`}>{cfg.label}</span>
        <span className="text-[10px] md:text-xs text-text-dim mt-0.5">Sem registro</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${compact ? 'items-end' : 'items-end'}`}>
      <span className={`text-[10px] md:text-xs font-bold ${cfg.bg} ${cfg.text} px-2 py-0.5 md:py-1 rounded-lg`}>{cfg.label}</span>
      <span className={`text-[10px] md:text-xs mt-0.5 ${status === 'CAFE_EXCEDIDO' ? 'text-red-400/70 font-semibold' : 'text-text-faint'}`}>
        {status === 'TRABALHANDO' ? `há ${tempo}` : status === 'ENCERROU' ? `saiu há ${tempo}` : `há ${tempo}`}
      </span>
    </div>
  );
}

function AlertaItem({ alerta }: { alerta: any }) {
  const configs: Record<string, { icon: any; bg: string; border: string; text: string; label: string }> = {
    ATRASO: {
      icon: Clock,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      label: 'Atraso',
    },
    AUSENCIA_SEM_JUSTIFICATIVA: {
      icon: UserX,
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      label: 'Falta',
    },
    HORA_EXTRA: {
      icon: Hourglass,
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      text: 'text-orange-400',
      label: 'Hora extra',
    },
    SAIU_CEDO: {
      icon: LogOut,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      label: 'Saiu cedo',
    },
    PADRAO_ATRASO: {
      icon: AlertTriangle,
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      label: 'Recorrente',
    },
  };

  const cfg = configs[alerta.tipo] || configs.ATRASO;
  const Icon = cfg.icon;

  let detalhe = '';
  if (alerta.tipo === 'ATRASO') {
    detalhe = `Entrada era às ${alerta.horarioConfigurado}, mas chegou ${alerta.minutosAtraso} minutos atrasado(a)`;
  } else if (alerta.tipo === 'AUSENCIA_SEM_JUSTIFICATIVA') {
    detalhe = `Deveria ter entrado às ${alerta.horarioConfigurado}, mas não bateu o ponto hoje`;
  } else if (alerta.tipo === 'HORA_EXTRA') {
    const extra = alerta.minutosExtra;
    const h = Math.floor(extra / 60);
    const m = extra % 60;
    const tempo = h > 0 ? `${h}h${m > 0 ? ` e ${m}min` : ''}` : `${m} minutos`;
    detalhe = `Trabalhou ${tempo} a mais do que o previsto`;
  } else if (alerta.tipo === 'SAIU_CEDO') {
    const falta = alerta.minutosFaltantes;
    const h = Math.floor(falta / 60);
    const m = falta % 60;
    const tempo = h > 0 ? `${h}h${m > 0 ? ` e ${m}min` : ''}` : `${m} minutos`;
    detalhe = `Saiu ${tempo} antes do horário previsto`;
  } else if (alerta.tipo === 'PADRAO_ATRASO') {
    detalhe = alerta.mensagem || `Atenção: chegou atrasado(a) em ${alerta.diasAtrasado} de ${alerta.diasAnalisados} dias`;
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
        <Icon size={16} className={cfg.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{alerta.funcionarioNome}</p>
        <p className={`text-[11px] ${cfg.text} truncate`}>{detalhe}</p>
      </div>
      <span className={`text-[10px] font-bold ${cfg.bg} ${cfg.text} px-2 py-0.5 rounded-lg border ${cfg.border} shrink-0`}>
        {cfg.label}
      </span>
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
      className={`p-3 md:p-4 rounded-2xl border backdrop-blur-sm text-left transition-all active:scale-[0.97] cursor-pointer group
        ${corFundo}
        ${ativo ? `${corBordaAtiva} ring-1 ring-white/5 shadow-lg` : 'border-border-subtle hover:border-border-default'}`}
    >
      <div className="flex justify-between items-start mb-1 md:mb-1.5">
        <div className={`${corIcone} opacity-80 group-hover:opacity-100 transition-opacity`}>{icone}</div>
        <span className={`text-xl md:text-2xl font-bold ${corTexto} tabular-nums`}>{valor}</span>
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
