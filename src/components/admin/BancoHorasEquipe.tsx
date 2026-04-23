'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import {
  TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronUp,
  Users, RefreshCw, Trash2, ChevronLeft, ChevronRight, Calendar, X,
  DollarSign, CalendarOff, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Aba = 'saldo' | 'mes' | 'ajustes';

interface FuncSaldo {
  id: string;
  nome: string;
  fotoPerfilUrl: string | null;
  saldo: string;
  saldoMinutos: number;
  saldoPositivo: boolean;
}

type AjusteHandler = (
  usuarioId?: string,
  tipo?: 'PAGAMENTO_HE' | 'COMPENSACAO_FOLGA' | 'CORRECAO_MANUAL',
) => void;

function getMesesDisponiveis() {
  const meses = [];
  const agora = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    meses.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MM/yyyy'),
    });
  }
  return meses;
}

export default function BancoHorasEquipe({
  onAjustar,
  refreshKey,
}: {
  onAjustar?: AjusteHandler;
  refreshKey?: number;
}) {
  const [aba, setAba] = useState<Aba>('saldo');
  const [data, setData] = useState<{ periodo: { inicio: string; fim: string }; funcionarios: FuncSaldo[]; ajustes?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [dataInicioAcumulado, setDataInicioAcumulado] = useState('');
  const [calAberto, setCalAberto] = useState(false);
  const [calMes, setCalMes] = useState(new Date());
  const calRef = useRef<HTMLDivElement>(null);

  const meses = getMesesDisponiveis();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalAberto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const carregar = useCallback(() => {
    setLoading(true);
    let params = '';
    if (aba === 'mes') params = `?mes=${mesSelecionado}`;
    else if (aba === 'saldo' && dataInicioAcumulado) params = `?inicio=${dataInicioAcumulado}`;

    axios.get(`/api/admin/banco-horas-equipe${params}`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, mesSelecionado, dataInicioAcumulado, refreshKey]);

  useEffect(() => { carregar(); }, [carregar]);

  if (!data && loading) {
    return (
      <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-5">
        <div className="h-5 w-48 bg-hover-bg rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-hover-bg rounded-full animate-pulse" />
              <div className="flex-1 h-4 bg-hover-bg rounded animate-pulse" />
              <div className="w-16 h-4 bg-hover-bg rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const funcionarios: FuncSaldo[] = data.funcionarios;
  const ajustes: any[] = data.ajustes || [];
  const listaVisivel = mostrarTodos ? funcionarios : funcionarios.slice(0, 8);
  const maxAbsoluto = Math.max(...funcionarios.map(f => Math.abs(f.saldoMinutos)), 1);

  const subtitulo = aba === 'saldo'
    ? dataInicioAcumulado
      ? `Saldo desde ${dataInicioAcumulado.split('-').reverse().join('/')}`
      : 'Saldo total acumulado'
    : aba === 'mes'
      ? `Saldo do mês ${meses.find(m => m.value === mesSelecionado)?.label}`
      : `${ajustes.length} ajuste(s) lançado(s)`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header colapsável */}
      <div
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between bg-surface hover:bg-hover-bg border border-border-subtle rounded-2xl p-4 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/20 p-2 rounded-xl">
            <Clock size={20} className="text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-text-primary">Banco de Horas da Equipe</p>
            <p className="text-[11px] text-text-faint">{subtitulo} · {funcionarios.length} funcionários</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); carregar(); }}
            className="p-1.5 text-text-faint hover:text-text-primary hover:bg-hover-bg rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {aberto ? <ChevronUp size={18} className="text-text-faint" /> : <ChevronDown size={18} className="text-text-faint" />}
        </div>
      </div>

      {aberto && (
        <div className="mt-2 bg-surface rounded-2xl border border-border-subtle relative">
          {/* Abas */}
          <div className="flex border-b border-border-subtle rounded-t-2xl overflow-hidden">
            {([
              { key: 'saldo' as Aba, label: 'Saldo Atual' },
              { key: 'mes' as Aba, label: 'Por Mês' },
              { key: 'ajustes' as Aba, label: `Ajustes Lançados${ajustes.length > 0 ? ` (${ajustes.length})` : ''}` },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setAba(t.key)}
                className={`flex-1 px-4 py-3 text-xs font-bold transition-colors border-b-2 ${
                  aba === t.key
                    ? 'text-purple-400 border-purple-500'
                    : 'text-text-muted border-transparent hover:text-text-primary hover:bg-hover-bg'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filtros específicos por aba */}
          {aba === 'saldo' && (
            <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-text-faint font-bold uppercase">Calcular a partir de:</span>
              <div className="relative" ref={calRef}>
                <button
                  onClick={() => setCalAberto(!calAberto)}
                  className="flex items-center gap-1.5 bg-page border border-border-default hover:border-purple-500/50 rounded-lg px-2.5 py-1.5 text-xs text-text-primary transition-colors"
                >
                  <Calendar size={12} className="text-purple-400" />
                  {dataInicioAcumulado
                    ? dataInicioAcumulado.split('-').reverse().join('/')
                    : 'Início do uso (padrão)'}
                </button>

                {calAberto && (() => {
                  const inicio = startOfMonth(calMes);
                  const fim = endOfMonth(calMes);
                  const dias = eachDayOfInterval({ start: inicio, end: fim });
                  const primeiroDiaSemana = getDay(inicio);

                  return (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-surface-solid border border-border-default rounded-xl shadow-2xl p-3 w-[260px] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <button onClick={() => setCalMes(subMonths(calMes, 1))} className="p-1.5 hover:bg-hover-bg rounded-lg">
                          <ChevronLeft size={14} className="text-text-muted" />
                        </button>
                        <span className="text-xs font-bold text-text-primary capitalize">
                          {format(calMes, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button onClick={() => setCalMes(addMonths(calMes, 1))} className="p-1.5 hover:bg-hover-bg rounded-lg">
                          <ChevronRight size={14} className="text-text-muted" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                          <div key={i} className="text-center text-[9px] font-bold text-text-dim py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                          <div key={`e-${i}`} className="aspect-square" />
                        ))}
                        {dias.map(dia => {
                          const diaStr = format(dia, 'yyyy-MM-dd');
                          const selecionado = dataInicioAcumulado === diaStr;
                          const hoje = isSameDay(dia, new Date());
                          return (
                            <button
                              key={diaStr}
                              onClick={() => { setDataInicioAcumulado(diaStr); setCalAberto(false); }}
                              className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all ${
                                selecionado
                                  ? 'bg-purple-600 text-white font-bold'
                                  : hoje
                                    ? 'ring-1 ring-purple-500 text-purple-400'
                                    : 'text-text-muted hover:bg-hover-bg hover:text-text-primary'
                              }`}
                            >
                              {format(dia, 'd')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              {dataInicioAcumulado && (
                <button
                  onClick={() => setDataInicioAcumulado('')}
                  className="p-1 text-text-dim hover:text-red-400 transition-colors"
                  title="Voltar pro padrão"
                >
                  <X size={14} />
                </button>
              )}
              <span className="text-[10px] text-text-dim ml-auto">
                {dataInicioAcumulado ? 'Use quando a empresa começou a pagar HE depois do início do uso' : 'Conta tudo desde que cada funcionário foi cadastrado'}
              </span>
            </div>
          )}

          {aba === 'mes' && (
            <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
              <span className="text-[10px] text-text-faint font-bold uppercase">Mês de referência:</span>
              <select
                value={mesSelecionado}
                onChange={e => setMesSelecionado(e.target.value)}
                className="bg-page border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-purple-500"
              >
                {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <span className="text-[10px] text-text-dim ml-auto">Saldo isolado do mês escolhido</span>
            </div>
          )}

          {/* Conteúdo das abas */}
          {(aba === 'saldo' || aba === 'mes') && (
            <>
              {funcionarios.length === 0 ? (
                <div className="p-8 text-center text-text-faint text-sm">Nenhum funcionário encontrado</div>
              ) : (
                <>
                  <div className="divide-y divide-border-subtle">
                    {listaVisivel.map((func) => {
                      const barWidth = maxAbsoluto > 0 ? (Math.abs(func.saldoMinutos) / maxAbsoluto) * 100 : 0;
                      const positivo = func.saldoMinutos > 0;
                      const negativo = func.saldoMinutos < 0;

                      return (
                        <div key={func.id} className="px-4 py-3 flex items-center gap-3 hover:bg-hover-bg/50 transition-colors">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-elevated-solid border border-border-default overflow-hidden shrink-0">
                            {func.fotoPerfilUrl ? (
                              <Image src={func.fotoPerfilUrl} alt="" width={32} height={32} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Users size={14} className="text-text-faint" />
                              </div>
                            )}
                          </div>

                          {/* Nome + barra */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{func.nome}</p>
                            <div className="mt-1 h-1.5 bg-elevated-solid rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  positivo ? 'bg-emerald-500' : negativo ? 'bg-rose-500' : 'bg-slate-600'
                                }`}
                                style={{ width: `${Math.max(barWidth, 2)}%` }}
                              />
                            </div>
                          </div>

                          {/* Saldo */}
                          <div className="flex items-center gap-1.5 shrink-0 min-w-[80px] justify-end">
                            {positivo ? <TrendingUp size={14} className="text-emerald-500" />
                              : negativo ? <TrendingDown size={14} className="text-rose-500" />
                              : <Minus size={14} className="text-slate-500" />}
                            <span className={`text-sm font-bold font-mono ${
                              positivo ? 'text-emerald-400' : negativo ? 'text-rose-400' : 'text-text-faint'
                            }`}>
                              {func.saldo}
                            </span>
                          </div>

                          {/* Ações por linha */}
                          {onAjustar && (
                            <div className="flex items-center gap-1 shrink-0">
                              {positivo && (
                                <>
                                  <button
                                    onClick={() => onAjustar(func.id, 'PAGAMENTO_HE')}
                                    title="Pagar horas extras"
                                    className="p-1.5 text-text-dim hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                  >
                                    <DollarSign size={14} />
                                  </button>
                                  <button
                                    onClick={() => onAjustar(func.id, 'COMPENSACAO_FOLGA')}
                                    title="Compensar com folga"
                                    className="p-1.5 text-text-dim hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                  >
                                    <CalendarOff size={14} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => onAjustar(func.id, 'CORRECAO_MANUAL')}
                                title="Corrigir manualmente"
                                className="p-1.5 text-text-dim hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                              >
                                <Wrench size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {funcionarios.length > 8 && (
                    <button
                      onClick={() => setMostrarTodos(!mostrarTodos)}
                      className="w-full py-2.5 text-xs font-bold text-text-muted hover:text-purple-400 hover:bg-hover-bg transition-colors border-t border-border-subtle"
                    >
                      {mostrarTodos ? 'Ver menos' : `Ver todos (${funcionarios.length})`}
                    </button>
                  )}

                  {/* Legenda */}
                  {onAjustar && (
                    <div className="border-t border-border-subtle px-4 py-2.5 flex items-center gap-4 text-[10px] text-text-dim flex-wrap">
                      <span className="flex items-center gap-1"><DollarSign size={12} className="text-emerald-400" /> Pagar HE</span>
                      <span className="flex items-center gap-1"><CalendarOff size={12} className="text-blue-400" /> Compensar c/ folga</span>
                      <span className="flex items-center gap-1"><Wrench size={12} className="text-purple-400" /> Correção manual</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {aba === 'ajustes' && (
            <>
              {ajustes.length === 0 ? (
                <div className="p-8 text-center text-text-faint text-sm">Nenhum ajuste lançado ainda</div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {ajustes.map((aj: any) => {
                    const h = Math.floor(Math.abs(aj.minutos) / 60);
                    const m = Math.abs(aj.minutos) % 60;
                    const tipoLabels: Record<string, string> = {
                      PAGAMENTO_HE: 'Pagamento HE',
                      COMPENSACAO_FOLGA: 'Compensação',
                      CORRECAO_MANUAL: 'Correção',
                    };
                    const [ano, mes, dia] = aj.data.split('-');

                    return (
                      <div key={aj.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-hover-bg/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-text-primary">{aj.usuarioNome}</span>
                            <span className="text-[10px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                              {tipoLabels[aj.tipo] || aj.tipo}
                            </span>
                            <span className={`text-xs font-bold font-mono ${aj.minutos < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {aj.minutos < 0 ? '-' : '+'}{h}h{String(m).padStart(2, '0')}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-dim truncate">Ref. {dia}/{mes}/{ano} · {aj.motivo}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm(`Excluir ajuste de ${aj.usuarioNome}?`)) return;
                            try {
                              await axios.delete('/api/admin/ajuste-banco', { data: { id: aj.id } });
                              toast.success('Ajuste excluído');
                              carregar();
                            } catch {
                              toast.error('Erro ao excluir');
                            }
                          }}
                          className="p-1.5 text-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          title="Excluir ajuste"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
