'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  format,
  differenceInMinutes,
  isSameDay,
  getDay,
  eachDayOfInterval,
  getISOWeek,
  getYear,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  History,
  Calendar,
  Search,
  Clock,
  Edit3,
  PlusCircle,
  LogIn,
  LogOut,
  AlertTriangle,
  X,
  Save,
  CheckCircle2,
  XCircle,
  ListFilter,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Coffee,
  UtensilsCrossed,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import BotaoRelatorio from '@/components/BotaoRelatorio';
import { useSearchParams, useRouter } from 'next/navigation';

const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

type AvisoModal = {
  tipo: 'sucesso' | 'erro' | 'info';
  texto: string;
};

// === LABELS E CORES ===
const TIPO_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icon: any }> = {
  ENTRADA: { label: 'Entrada', cor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: LogIn },
  VOLTA_ALMOCO: { label: 'Volta Almoço', cor: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: LogIn },
  VOLTA_INTERVALO: { label: 'Volta Café', cor: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: LogIn },
  SAIDA_ALMOCO: { label: 'Almoço', cor: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: UtensilsCrossed },
  SAIDA_INTERVALO: { label: 'Café', cor: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Coffee },
  SAIDA: { label: 'Saída', cor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: LogOut },
  PONTO: { label: 'Ponto', cor: 'text-text-muted', bg: 'bg-slate-500/10', border: 'border-border-input/20', icon: Clock },
  AUSENCIA: { label: 'Ausência', cor: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle },
};

const getTipoConfig = (tipo: string) => TIPO_CONFIG[tipo] || TIPO_CONFIG.PONTO;

const STATUS_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icon: any }> = {
  PENDENTE: { label: 'Pendente', cor: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Clock },
  APROVADO: { label: 'Aprovado', cor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2 },
  REJEITADO: { label: 'Rejeitado', cor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle },
};

export default function MeuHistorico() {
  // === ESTADOS ===
  const [abaAtiva, setAbaAtiva] = useState<'PONTO' | 'SOLICITACOES'>('PONTO');

  const [pontos, setPontos] = useState<any[]>([]);
  const [empresaNome, setEmpresaNome] = useState('Carregando...');
  const [jornada, setJornada] = useState<any>(null);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [resumo, setResumo] = useState<{ total: string; saldo: string; saldoPositivo: boolean } | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<'EDICAO' | 'INCLUSAO'>('EDICAO');
  const [pontoSelecionado, setPontoSelecionado] = useState<any>(null);
  const [dataNova, setDataNova] = useState('');
  const [horaNova, setHoraNova] = useState('');
  const [tipoNovo, setTipoNovo] = useState('ENTRADA');
  const [motivo, setMotivo] = useState('');
  const [avisoModal, setAvisoModal] = useState<AvisoModal | null>(null);

  // Exclusão de ponto
  const [pontoParaExcluir, setPontoParaExcluir] = useState<any>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Calendário
  const [mostrarCalendario, setMostrarCalendario] = useState(true);
  const [mesCalendario, setMesCalendario] = useState(new Date());

  // Solicitação expandida
  const [solicitacaoExpandida, setSolicitacaoExpandida] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const abriuAutoRef = useRef(false);

  const ajustarId = searchParams.get('ajustar');

  // === CÁLCULO INTELIGENTE (COM TOLERÂNCIA CLT DE 10 MINUTOS) ===
  const calcularHorasAvancado = (listaRegistros: any[], jornadaConfig: any, listaFeriados: string[], heAprovadas?: Array<{ data: string; minutosExtra: number }>) => {
    if (!listaRegistros) return { total: '0h 0m', saldo: '0h 0m', saldoPositivo: true };

    const agora = new Date();
    const toDateStr = (d: Date | string) => format(new Date(d), 'yyyy-MM-dd');

    const pontosPorDia: Record<string, any[]> = {};
    const diasComPontos = new Set<string>();

    listaRegistros.forEach(p => {
      if (p.tipo !== 'AUSENCIA') {
        const dia = toDateStr(p.dataHora);
        if (!pontosPorDia[dia]) pontosPorDia[dia] = [];
        pontosPorDia[dia].push(p);
        diasComPontos.add(dia);
      }
    });

    Object.keys(pontosPorDia).forEach(dia => {
      pontosPorDia[dia].sort((a: any, b: any) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    });

    const diasIsentos = new Set<string>();
    const ausencias = listaRegistros.filter(p => p.tipo === 'AUSENCIA');
    ausencias.forEach(aus => {
      const inicio = new Date(aus.dataHora);
      const fim = aus.extra?.dataFim ? new Date(aus.extra.dataFim) : inicio;
      try {
        eachDayOfInterval({ start: inicio, end: fim }).forEach(d => diasIsentos.add(toDateStr(d)));
      } catch {}
    });

    const semanasComSabado = new Set<string>();
    Object.keys(pontosPorDia).forEach(diaStr => {
      const data = criarDataLocal(diaStr);
      if (getDay(data) === 6) {
        semanasComSabado.add(`${getYear(data)}-${getISOWeek(data)}`);
      }
    });

    const isValidTimeHHMM = (v: any) => typeof v === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);

    const getMetaDoDia = (data: Date) => {
      const dataString = format(data, 'yyyy-MM-dd');
      if (feriados.includes(dataString) || diasIsentos.has(dataString)) return 0;

      const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const diaSemanaIndex = getDay(data);
      const diaSemana = diasMap[diaSemanaIndex];

      const chaveSemanaAtual = `${getYear(data)}-${getISOWeek(data)}`;
      const trabalhouSabado = semanasComSabado.has(chaveSemanaAtual);

      const config = jornadaConfig[diaSemana];

      const calcDiff = (i: string, f: string) => {
        if (!i || !f) return 0;
        const [h1, m1] = i.split(':').map(Number);
        const [h2, m2] = f.split(':').map(Number);
        let diff = h2 * 60 + m2 - (h1 * 60 + m1);
        if (diff < 0) diff += 1440;
        return diff;
      };

      const calcMinutosConfig = (cfg: any) => {
        if (!cfg || !cfg.ativo) return 0;
        const hS1 = isValidTimeHHMM(cfg.s1);
        const hE2 = isValidTimeHHMM(cfg.e2);
        if (!hS1 && !hE2 && isValidTimeHHMM(cfg.e1) && isValidTimeHHMM(cfg.s2)) {
          return calcDiff(cfg.e1, cfg.s2);
        }
        return calcDiff(cfg.e1, cfg.s1) + calcDiff(cfg.e2, cfg.s2);
      };

      let minutosConfigurados = calcMinutosConfig(config);

      // --- LÓGICA HÍBRIDA INTELIGENTE ---
      const configSabHibrido = jornadaConfig['sab'];
      const sabTemRegraEspecifica = (() => {
        const regra = configSabHibrido?.regra;
        if (!regra?.tipo) return false;
        if (regra.tipo === 'SABADOS_DO_MES') {
          const quais = Array.isArray(regra.quais) ? regra.quais : [];
          return quais.length > 0;
        }
        return true;
      })();
      const sabRegular = configSabHibrido && configSabHibrido.ativo
        && !sabTemRegraEspecifica
        && !(configSabHibrido.alternado === true);
      const metaSabRegular = sabRegular ? (calcMinutosConfig(configSabHibrido) || 240) : 0;

      if (diaSemanaIndex >= 1 && diaSemanaIndex <= 5) {
        if (trabalhouSabado) {
          if (!minutosConfigurados) minutosConfigurados = 480;
          else if (minutosConfigurados > 520) minutosConfigurados = 480;
        } else if (sabRegular && metaSabRegular > 0) {
          const sabadoDaSemana = new Date(data);
          sabadoDaSemana.setDate(sabadoDaSemana.getDate() + (6 - diaSemanaIndex));
          const hoje = new Date();
          hoje.setHours(23, 59, 59, 999);
          const sabadoJaPassou = sabadoDaSemana <= hoje;

          if (sabadoJaPassou && !trabalhouSabado) {
            const compensacaoPorDia = Math.round(metaSabRegular / 5);
            minutosConfigurados = minutosConfigurados + compensacaoPorDia;
          }
        }
      }

      if (diaSemanaIndex === 6) {
        const configSab = jornadaConfig['sab'];
        const temConfiguracao = configSab && configSab.ativo;
        if (trabalhouSabado && !temConfiguracao) return 240;

        // Sábado regular configurado mas não trabalhado: meta = 0 (compensado nos dias úteis)
        if (temConfiguracao && !trabalhouSabado) {
          const regra = configSab?.regra;
          const quaisSab = regra?.tipo === 'SABADOS_DO_MES' && Array.isArray(regra?.quais) ? regra.quais : [];
          const isAlternado = configSab?.alternado === true;
          const temRegraEfetiva = regra?.tipo === 'SABADOS_DO_MES' && quaisSab.length > 0;
          if (!temRegraEfetiva && !isAlternado) return 0;
        }
      }

      return minutosConfigurados;
    };

    let saldoTotalBanco = 0;
    let minutosTotalTrabalhado = 0;

    let loopData = criarDataLocal(dataInicio);
    const fimData = criarDataLocal(dataFim);

    while (loopData <= fimData) {
      if (loopData <= agora) {
        const diaStr = toDateStr(loopData);
        const metaDia = getMetaDoDia(loopData);

        let trabalhadoDia = 0;
        const pontosDia = pontosPorDia[diaStr] || [];

        for (let i = 0; i < pontosDia.length; i++) {
          const pEntrada = pontosDia[i];
          const tipoEnt = pEntrada.subTipo || pEntrada.tipo;

          if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipoEnt)) {
            const pSaida = pontosDia[i + 1];
            const tipoSaida = pSaida ? (pSaida.subTipo || pSaida.tipo) : null;

            const entrada = new Date(pEntrada.dataHora);

            if (pSaida && ['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
              const saida = new Date(pSaida.dataHora);
              let diff = differenceInMinutes(saida, entrada);

              if (diff > 0 && diff < 1440) trabalhadoDia += diff;

              if (tipoSaida === 'SAIDA_INTERVALO') {
                const pVolta = pontosDia[i + 2];
                if (pVolta) {
                  const volta = new Date(pVolta.dataHora);
                  const intervalo = differenceInMinutes(volta, saida);
                  if (intervalo > 0) trabalhadoDia += Math.min(intervalo, 15);
                }
              }
              i++;
            } else if (isSameDay(entrada, agora)) {
              const diff = differenceInMinutes(agora, entrada);
              if (diff > 0) trabalhadoDia += diff;
            }
          }
        }

        minutosTotalTrabalhado += trabalhadoDia;

        if (!diasIsentos.has(diaStr)) {
          // Cortar hora extra no saldo se não aprovada
          const toleranciaHE = 10;
          let trabalhadoEfetivo = trabalhadoDia;

          const temHoraExtra = metaDia > 0
            ? trabalhadoDia > metaDia + toleranciaHE
            : trabalhadoDia > toleranciaHE;

          if (temHoraExtra) {
            trabalhadoEfetivo = metaDia; // corta no expediente
            const aprovada = heAprovadas?.find(h => h.data === diaStr);
            if (aprovada) {
              trabalhadoEfetivo = metaDia + aprovada.minutosExtra;
            }
          }

          let saldoDia = trabalhadoEfetivo - metaDia;
          if (Math.abs(saldoDia) <= 10) saldoDia = 0;
          saldoTotalBanco += saldoDia;
        }
      }
      loopData.setDate(loopData.getDate() + 1);
    }

    const formatarHoras = (min: number) => {
      const sinal = min < 0 ? '-' : '';
      const absMin = Math.abs(min);
      return `${sinal}${Math.floor(absMin / 60)}h ${absMin % 60}m`;
    };

    return {
      total: formatarHoras(minutosTotalTrabalhado),
      saldo: formatarHoras(saldoTotalBanco),
      saldoPositivo: saldoTotalBanco >= 0,
    };
  };

  // === CARREGAMENTO ===
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const resHistorico = await axios.get(`/api/funcionario/historico?inicio=${dataInicio}&fim=${dataFim}`);

      if (resHistorico.data.pontos) {
        setPontos(resHistorico.data.pontos);
        setEmpresaNome(resHistorico.data.empresaNome);
        setJornada(resHistorico.data.jornada);
        setFeriados(resHistorico.data.feriados);
        setResumo(calcularHorasAvancado(resHistorico.data.pontos, resHistorico.data.jornada, resHistorico.data.feriados, resHistorico.data.horasExtrasAprovadas));
      } else {
        setPontos(resHistorico.data);
      }

      const resSolicitacoes = await axios.get('/api/funcionario/minhas-solicitacoes');
      setSolicitacoes(resSolicitacoes.data);
    } catch {
      console.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // === AÇÕES DO MODAL ===
  const abrirInclusao = () => {
    setModoModal('INCLUSAO');
    setPontoSelecionado(null);
    setDataNova(format(new Date(), 'yyyy-MM-dd'));
    setHoraNova('');
    setTipoNovo('ENTRADA');
    setMotivo('');
    setAvisoModal(null);
    setModalAberto(true);
  };

  const abrirEdicao = useCallback((ponto: any) => {
    setModoModal('EDICAO');
    setPontoSelecionado(ponto);
    setDataNova(format(new Date(ponto.dataHora), 'yyyy-MM-dd'));
    setHoraNova(format(new Date(ponto.dataHora), 'HH:mm'));
    setMotivo('');
    setAvisoModal(null);
    setModalAberto(true);
  }, []);

  // Auto-open por querystring
  useEffect(() => {
    if (!ajustarId || abriuAutoRef.current || loading || !pontos?.length) return;

    const pontoEncontrado = pontos.find(p => p.id === ajustarId);
    abriuAutoRef.current = true;

    if (pontoEncontrado) {
      abrirEdicao(pontoEncontrado);
    } else {
      setModoModal('EDICAO');
      setPontoSelecionado(null);
      setDataNova('');
      setHoraNova('');
      setMotivo('');
      setAvisoModal({ tipo: 'info', texto: 'Registro não encontrado no período atual. Ajuste o filtro de datas.' });
      setModalAberto(true);
    }

    setTimeout(() => router.replace('/funcionario/historico', { scroll: false }), 50);
  }, [ajustarId, loading, pontos, router, abrirEdicao]);

  const enviarSolicitacao = async () => {
    setAvisoModal(null);

    if (!motivo || !horaNova || (modoModal === 'INCLUSAO' && !dataNova)) {
      setAvisoModal({ tipo: 'erro', texto: 'Preencha todos os campos!' });
      return;
    }

    if (modoModal === 'EDICAO' && !pontoSelecionado?.id) {
      setAvisoModal({ tipo: 'erro', texto: 'Registro inválido. Feche e tente novamente.' });
      return;
    }

    const dataBase = modoModal === 'EDICAO'
      ? format(new Date(pontoSelecionado.dataHora), 'yyyy-MM-dd')
      : dataNova;

    const dataHoraFinal = new Date(`${dataBase}T${horaNova}:00`);

    try {
      await axios.post('/api/funcionario/solicitar-ajuste', {
        pontoId: pontoSelecionado?.id ?? null,
        tipo: modoModal === 'INCLUSAO' ? tipoNovo : null,
        novoHorario: dataHoraFinal.toISOString(),
        motivo,
      });

      setAvisoModal({ tipo: 'sucesso', texto: 'Solicitação enviada com sucesso!' });
      setTimeout(() => { setModalAberto(false); setAvisoModal(null); }, 900);
      carregar();
    } catch (error: any) {
      const data = error?.response?.data ?? {};
      const msg = data?.erro || 'Erro ao enviar.';
      const code = data?.code;

      if (code === 'USE_AJUSTE') {
        setAvisoModal({ tipo: 'info', texto: msg || 'Você já registrou esse ponto. Solicite AJUSTE.' });
        return;
      }

      setAvisoModal({ tipo: 'erro', texto: msg });
    }
  };

  // === EXCLUSÃO DE PONTO ===
  const confirmarExclusao = async () => {
    if (!pontoParaExcluir) return;
    setExcluindo(true);
    try {
      await axios.delete('/api/funcionario/ponto/excluir', {
        data: { id: pontoParaExcluir.id },
      });
      setPontoParaExcluir(null);
      carregar();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao excluir registro.');
    } finally {
      setExcluindo(false);
    }
  };

  // === FILTROS ===
  const pontosFiltrados = pontos.filter(p => {
    if (p.tipo === 'AUSENCIA') {
      const ini = format(new Date(p.dataHora), 'yyyy-MM-dd');
      const fim = p.extra?.dataFim ? format(new Date(p.extra.dataFim), 'yyyy-MM-dd') : ini;
      return ini <= dataFim && fim >= dataInicio;
    } else {
      const dia = format(new Date(p.dataHora), 'yyyy-MM-dd');
      return dia >= dataInicio && dia <= dataFim;
    }
  });

  const pontosParaRelatorio = pontosFiltrados.map(p => ({
    ...p,
    tipo: p.tipo === 'AUSENCIA' ? 'AUSENCIA' : 'PONTO',
    subTipo: p.subTipo || p.tipo,
    descricao: p.descricao || (p.tipo === 'AUSENCIA' ? 'Atestado/Férias' : 'Registro Manual'),
  }));

  // Agrupar pontos por data
  const pontosPorData = pontosFiltrados.reduce((acc: Record<string, any[]>, ponto) => {
    const dia = format(new Date(ponto.dataHora), 'yyyy-MM-dd');
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(ponto);
    return acc;
  }, {});

  // Ordenar datas (mais recente primeiro)
  const datasOrdenadas = Object.keys(pontosPorData).sort((a, b) => b.localeCompare(a));

  // Contadores de solicitações
  const countPendentes = solicitacoes.filter(s => s.status === 'PENDENTE').length;

  return (
    <div
      className="min-h-screen bg-page text-text-secondary font-sans relative overflow-hidden"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
    >
      {/* Background decorations */}
      <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-orb-purple rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-orb-indigo rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 pb-24 relative z-10">

        {/* === HEADER === */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <History className="text-purple-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary leading-tight">Meu Histórico</h1>
              <p className="text-[11px] text-text-faint font-medium">{empresaNome}</p>
            </div>
          </div>
        </div>

        {/* === TABS === */}
        <div className="bg-surface/60 backdrop-blur p-1 rounded-2xl flex gap-1 border border-border-subtle mb-5">
          <button
            onClick={() => setAbaAtiva('PONTO')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              abaAtiva === 'PONTO'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-text-muted hover:text-text-primary hover:bg-hover-bg'
            }`}
          >
            <Calendar size={14} /> Espelho de Ponto
          </button>
          <button
            onClick={() => setAbaAtiva('SOLICITACOES')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 relative ${
              abaAtiva === 'SOLICITACOES'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-text-muted hover:text-text-primary hover:bg-hover-bg'
            }`}
          >
            <ListFilter size={14} /> Solicitações
            {countPendentes > 0 && (
              <span className="w-5 h-5 bg-amber-500 text-[10px] font-bold text-black rounded-full flex items-center justify-center">
                {countPendentes}
              </span>
            )}
          </button>
        </div>

        {/* === ABA: ESPELHO DE PONTO === */}
        {abaAtiva === 'PONTO' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">

            {/* Resumo */}
            {resumo && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface/60 backdrop-blur border border-purple-500/20 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-purple-400" />
                    <span className="text-[10px] text-purple-300/70 uppercase font-bold tracking-widest">Trabalhado</span>
                  </div>
                  <p className="text-2xl font-bold text-text-primary tracking-tight">{resumo.total}</p>
                </div>

                <div className={`backdrop-blur border p-4 rounded-2xl ${
                  resumo.saldoPositivo
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {resumo.saldoPositivo
                      ? <TrendingUp size={14} className="text-emerald-400" />
                      : <TrendingDown size={14} className="text-red-400" />
                    }
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${
                      resumo.saldoPositivo ? 'text-emerald-300/70' : 'text-red-300/70'
                    }`}>Banco</span>
                  </div>
                  <p className={`text-2xl font-bold tracking-tight ${
                    resumo.saldoPositivo ? 'text-emerald-400' : 'text-red-400'
                  }`}>{resumo.saldo}</p>
                </div>
              </div>
            )}

            {/* Botão Esqueci */}
            <button
              onClick={abrirInclusao}
              className="w-full bg-surface/40 hover:bg-elevated/60 border border-dashed border-border-input hover:border-purple-500/30 py-4 rounded-2xl font-bold text-sm text-text-secondary flex items-center justify-center gap-2 transition-all hover:text-text-primary active:scale-[0.98]"
            >
              <PlusCircle size={18} className="text-purple-400" /> Esqueci de Bater o Ponto
            </button>

            {/* Filtros */}
            <div className="bg-surface/60 backdrop-blur-md p-4 rounded-2xl border border-border-subtle space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-faint font-bold uppercase ml-1">De</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full bg-input-solid/60 border border-border-default p-2.5 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500 transition-colors text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Até</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full bg-input-solid/60 border border-border-default p-2.5 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500 transition-colors text-center"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={carregar}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Search size={16} /> Buscar</>
                  )}
                </button>

                {pontosFiltrados.length > 0 && (
                  <div className="flex-1">
                    <BotaoRelatorio
                      pontos={pontosParaRelatorio}
                      filtro={{
                        inicio: criarDataLocal(dataInicio),
                        fim: criarDataLocal(dataFim),
                        usuario: 'Eu',
                      }}
                      resumoHoras={resumo}
                      nomeEmpresa={empresaNome}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Calendário */}
            <div className="flex justify-end">
              <button
                onClick={() => setMostrarCalendario(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-purple-400 hover:bg-purple-500/10 border border-border-subtle hover:border-purple-500/20 transition-all"
              >
                <Calendar size={14} />
                {mostrarCalendario ? 'Ocultar Calendário' : 'Mostrar Calendário'}
              </button>
            </div>

            {/* Calendário Mensal */}
            {mostrarCalendario && (() => {
              const hoje = new Date();
              const inicioMes = startOfMonth(mesCalendario);
              const fimMes = endOfMonth(mesCalendario);
              const diasDoMes = eachDayOfInterval({ start: inicioMes, end: fimMes });
              const primeiroDiaSemana = getDay(inicioMes); // 0=Dom

              const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

              const getCorDia = (dia: Date) => {
                const diaStr = format(dia, 'yyyy-MM-dd');
                const diaSemanaIdx = getDay(dia);
                const isFuturo = dia > hoje;
                const isHoje = isSameDay(dia, hoje);
                const isFeriado = feriados.includes(diaStr);

                // Weekend check
                const configDia = jornada ? jornada[diasMap[diaSemanaIdx]] : null;
                const isDiaAtivo = configDia?.ativo === true;

                // Fim de semana ou dia inativo ou futuro
                if (isFuturo) return { bg: 'bg-slate-800/30', text: 'text-text-dim', dot: '' };
                if (isFeriado) return { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400' };
                if (!isDiaAtivo) return { bg: 'bg-slate-800/30', text: 'text-text-dim', dot: '' };

                // Check pontos for this day
                const pontosDoDia = pontos.filter(p => {
                  if (p.tipo === 'AUSENCIA') {
                    const ini = format(new Date(p.dataHora), 'yyyy-MM-dd');
                    const fim = p.extra?.dataFim ? format(new Date(p.extra.dataFim), 'yyyy-MM-dd') : ini;
                    return diaStr >= ini && diaStr <= fim;
                  }
                  return isSameDay(new Date(p.dataHora), dia);
                });

                // Check for absences (férias, atestado)
                const temAusencia = pontosDoDia.some(p => p.tipo === 'AUSENCIA');
                if (temAusencia) return { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400' };

                // No pontos on active weekday
                const pontosNormais = pontosDoDia.filter(p => p.tipo !== 'AUSENCIA');
                if (pontosNormais.length === 0) {
                  // Only mark as missed if the day has passed
                  if (dia < hoje && !isHoje) return { bg: 'bg-red-500/15', text: 'text-red-300', dot: 'bg-red-400' };
                  return { bg: 'bg-slate-800/30', text: 'text-text-dim', dot: '' };
                }

                // Check if has ENTRADA + SAIDA
                const tipos = pontosNormais.map(p => p.subTipo || p.tipo);
                const temEntrada = tipos.includes('ENTRADA');
                const temSaida = tipos.includes('SAIDA');

                if (temEntrada && temSaida) return { bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' };

                // Partial day
                return { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' };
              };

              const navMes = (dir: number) => {
                const novoMes = dir > 0 ? addMonths(mesCalendario, 1) : subMonths(mesCalendario, 1);
                setMesCalendario(novoMes);
                const novoInicio = format(startOfMonth(novoMes), 'yyyy-MM-dd');
                const novoFim = format(endOfMonth(novoMes), 'yyyy-MM-dd');
                setDataInicio(novoInicio);
                setDataFim(novoFim);
              };

              const clicarDia = (dia: Date) => {
                const diaStr = format(dia, 'yyyy-MM-dd');
                setDataInicio(diaStr);
                setDataFim(diaStr);
              };

              return (
                <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-4">
                  {/* Header: navegação de mês */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navMes(-1)}
                      className="p-2 rounded-xl hover:bg-hover-bg text-text-muted hover:text-text-primary transition-all active:scale-95"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-bold text-text-primary capitalize">
                      {format(mesCalendario, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button
                      onClick={() => navMes(1)}
                      className="p-2 rounded-xl hover:bg-hover-bg text-text-muted hover:text-text-primary transition-all active:scale-95"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Cabeçalho dias da semana */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-text-faint uppercase py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Grid de dias */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Espaços vazios antes do primeiro dia */}
                    {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {diasDoMes.map(dia => {
                      const cores = getCorDia(dia);
                      const isHoje = isSameDay(dia, hoje);
                      const diaStr = format(dia, 'yyyy-MM-dd');
                      const isSelecionado = diaStr === dataInicio && diaStr === dataFim;

                      return (
                        <button
                          key={diaStr}
                          onClick={() => clicarDia(dia)}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all active:scale-90 ${cores.bg} ${
                            isHoje ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-page' : ''
                          } ${
                            isSelecionado ? 'ring-2 ring-white/40' : ''
                          }`}
                        >
                          <span className={`text-xs font-bold ${cores.text}`}>
                            {format(dia, 'd')}
                          </span>
                          {cores.dot && (
                            <div className={`w-1.5 h-1.5 rounded-full ${cores.dot} mt-0.5`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legenda */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-border-subtle">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-text-faint">Completo</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-[10px] text-text-faint">Parcial</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[10px] text-text-faint">Falta</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-[10px] text-text-faint">Ausência</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full ring-1 ring-purple-500 bg-transparent" />
                      <span className="text-[10px] text-text-faint">Hoje</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Lista de Pontos Agrupados por Data */}
            <div className="space-y-4">
              {pontosFiltrados.length === 0 && !loading && (
                <div className="text-center py-16">
                  <div className="bg-elevated/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={28} className="text-text-dim" />
                  </div>
                  <p className="text-text-faint text-sm font-medium">Nenhum registro neste período</p>
                  <p className="text-text-dim text-xs mt-1">Ajuste as datas e tente novamente</p>
                </div>
              )}

              {datasOrdenadas.map(dia => {
                const pontosDoDia = pontosPorData[dia].sort(
                  (a: any, b: any) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
                );
                const dataObj = criarDataLocal(dia);
                const diaSemana = format(dataObj, 'EEEE', { locale: ptBR });
                const diaFormatado = format(dataObj, "dd 'de' MMMM", { locale: ptBR });

                return (
                  <div key={dia}>
                    {/* Cabeçalho do dia */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary capitalize">{diaSemana}</span>
                        <span className="text-xs text-text-faint">{diaFormatado}</span>
                      </div>
                      <div className="flex-1 h-px bg-elevated-solid" />
                      <span className="text-[10px] text-text-dim font-mono">
                        {pontosDoDia.length} reg.
                      </span>
                    </div>

                    {/* Registros do dia - timeline */}
                    <div className="relative ml-3 pl-5 border-l-2 border-border-input space-y-2 mb-4">
                      {pontosDoDia.map((ponto: any) => {
                        const tipo = ponto.tipo === 'AUSENCIA' ? 'AUSENCIA' : (ponto.subTipo || ponto.tipo);
                        const cfg = getTipoConfig(tipo);
                        const Icon = cfg.icon;

                        return (
                          <div
                            key={ponto.id}
                            className="relative group"
                          >
                            {/* Dot na timeline */}
                            <div className={`absolute -left-[1.625rem] top-3 w-3 h-3 rounded-full border-2 border-page ${cfg.bg} ${cfg.border}`}>
                              <div className={`w-full h-full rounded-full ${cfg.bg}`} />
                            </div>

                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-white/[0.02] ${cfg.border} ${cfg.bg}`}>
                              {/* Ícone */}
                              <div className={`p-2 rounded-lg bg-input-solid/40 shrink-0`}>
                                <Icon size={16} className={cfg.cor} />
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-text-primary font-mono tracking-tight">
                                    {format(new Date(ponto.dataHora), 'HH:mm')}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.cor}`}>
                                    {cfg.label}
                                  </span>
                                </div>
                              </div>

                              {/* Ações */}
                              {ponto.tipo !== 'AUSENCIA' && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => abrirEdicao(ponto)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-faint hover:text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 transition-all active:scale-95"
                                  >
                                    <Edit3 size={14} /> Editar
                                  </button>
                                  <button
                                    onClick={() => setPontoParaExcluir(ponto)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-dim hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all active:scale-95"
                                  >
                                    <Trash2 size={14} /> Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* === ABA: SOLICITAÇÕES === */
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">

            {/* Info */}
            <div className="bg-surface/40 backdrop-blur border border-border-subtle rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl shrink-0">
                <ListFilter size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">Acompanhamento</p>
                <p className="text-xs text-text-faint mt-0.5">Status das suas solicitações de ajuste e inclusão de ponto</p>
              </div>
            </div>

            {/* Filtros rápidos */}
            {solicitacoes.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(['TODOS', 'PENDENTE', 'APROVADO', 'REJEITADO'] as const).map(filtro => {
                  const count = filtro === 'TODOS'
                    ? solicitacoes.length
                    : solicitacoes.filter(s => s.status === filtro).length;

                  return (
                    <button
                      key={filtro}
                      onClick={() => setSolicitacaoExpandida(filtro === 'TODOS' ? null : filtro)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border ${
                        (solicitacaoExpandida === null && filtro === 'TODOS') || solicitacaoExpandida === filtro
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-surface text-text-muted border-border-subtle hover:border-border-default'
                      }`}
                    >
                      {filtro === 'TODOS' ? 'Todas' : STATUS_CONFIG[filtro]?.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lista */}
            {solicitacoes.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-elevated/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-text-dim" />
                </div>
                <p className="text-text-faint text-sm font-medium">Nenhuma solicitação</p>
                <p className="text-text-dim text-xs mt-1">Suas solicitações de ajuste aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {solicitacoes
                  .filter(s => !solicitacaoExpandida || solicitacaoExpandida === 'TODOS' || s.status === solicitacaoExpandida)
                  .map(sol => {
                    const stCfg = STATUS_CONFIG[sol.status] || STATUS_CONFIG.PENDENTE;
                    const StIcon = stCfg.icon;
                    const isInclusao = !sol.pontoId;

                    return (
                      <div
                        key={sol.id}
                        className={`rounded-2xl border overflow-hidden transition-all ${stCfg.bg} ${stCfg.border}`}
                      >
                        <div className="p-4">
                          {/* Header da solicitação */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`p-2 rounded-xl ${stCfg.bg} border ${stCfg.border} shrink-0`}>
                                <StIcon size={16} className={stCfg.cor} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${stCfg.bg} ${stCfg.cor} border ${stCfg.border}`}>
                                    {stCfg.label}
                                  </span>
                                  <span className="text-[10px] text-text-dim bg-elevated px-2 py-0.5 rounded-lg font-medium">
                                    {isInclusao ? 'Inclusão' : 'Ajuste'}
                                  </span>
                                </div>
                                <p className="text-sm font-bold text-text-primary mt-1.5">
                                  {sol.novoHorario
                                    ? format(new Date(sol.novoHorario), "dd/MM/yyyy 'às' HH:mm")
                                    : 'Justificativa'
                                  }
                                </p>
                                {sol.tipo && (
                                  <span className={`text-[10px] font-bold uppercase ${getTipoConfig(sol.tipo).cor}`}>
                                    {getTipoConfig(sol.tipo).label}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="text-[10px] text-text-dim whitespace-nowrap font-mono shrink-0">
                              {format(new Date(sol.criadoEm), 'dd/MM HH:mm')}
                            </span>
                          </div>

                          {/* Justificativa */}
                          <div className="mt-3 bg-input-solid/30 rounded-xl p-3 border border-border-subtle">
                            <p className="text-xs text-text-muted leading-relaxed">
                              <span className="text-text-dim font-medium">Motivo: </span>
                              {sol.motivo}
                            </p>
                          </div>

                          {/* Decisão do admin */}
                          {sol.decididoPorNome && (
                            <div className="mt-2 flex items-center gap-2 text-[11px] text-text-faint">
                              <span className="font-medium">
                                {sol.status === 'APROVADO' ? 'Aprovado' : 'Rejeitado'} por {sol.decididoPorNome}
                              </span>
                              {sol.decididoEm && (
                                <span className="text-text-dim">
                                  em {format(new Date(sol.decididoEm), 'dd/MM HH:mm')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* === MODAL DE AJUSTE === */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setModalAberto(false)} />

            <div className="relative z-10 w-full max-w-sm bg-page border border-border-input rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
              {/* Header do modal */}
              <div className="bg-surface/60 border-b border-border-subtle px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  {modoModal === 'EDICAO' ? (
                    <><Edit3 size={18} className="text-purple-400" /> Ajustar Horário</>
                  ) : (
                    <><PlusCircle size={18} className="text-emerald-400" /> Incluir Registro</>
                  )}
                </h3>
                <button onClick={() => setModalAberto(false)} className="p-1.5 text-text-faint hover:text-text-primary rounded-lg hover:bg-hover-bg transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[70dvh] overflow-y-auto">
                {/* Aviso visual */}
                {avisoModal && (
                  <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2.5 ${
                    avisoModal.tipo === 'erro'
                      ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                      : avisoModal.tipo === 'sucesso'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                  }`}>
                    {avisoModal.tipo === 'erro' ? <AlertCircle size={16} /> : avisoModal.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    <span className="leading-snug text-xs">{avisoModal.texto}</span>
                  </div>
                )}

                {modoModal === 'INCLUSAO' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Data</label>
                      <input
                        type="date"
                        value={dataNova}
                        onChange={e => setDataNova(e.target.value)}
                        className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-sm text-center outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Tipo</label>
                      <select
                        value={tipoNovo}
                        onChange={e => setTipoNovo(e.target.value)}
                        className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-xs outline-none focus:border-purple-500 appearance-none"
                      >
                        <option value="ENTRADA">Entrada</option>
                        <option value="SAIDA_INTERVALO">Saída Café</option>
                        <option value="VOLTA_INTERVALO">Volta Café</option>
                        <option value="SAIDA_ALMOCO">Saída Almoço</option>
                        <option value="VOLTA_ALMOCO">Volta Almoço</option>
                        <option value="SAIDA">Saída</option>
                      </select>
                    </div>
                  </div>
                )}

                {modoModal === 'EDICAO' && (
                  <div className="bg-surface p-3 rounded-xl border border-border-subtle text-center">
                    <p className="text-[10px] text-text-faint uppercase tracking-widest font-bold">Data Original</p>
                    <p className="text-text-primary font-bold mt-0.5">
                      {pontoSelecionado?.dataHora ? format(new Date(pontoSelecionado.dataHora), 'dd/MM/yyyy') : '--/--/----'}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Novo Horário</label>
                  <input
                    type="time"
                    value={horaNova}
                    onChange={e => setHoraNova(e.target.value)}
                    className="w-full bg-input-solid/60 border border-border-default p-4 rounded-2xl text-text-primary text-3xl font-bold text-center outline-none focus:border-purple-500 transition-all focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-text-faint font-bold uppercase ml-1">Justificativa (Obrigatório)</label>
                  <textarea
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder="Ex: Esqueci de bater, estava em reunião..."
                    className="w-full bg-input-solid/60 border border-border-default p-3 rounded-xl text-text-primary text-sm h-20 resize-none outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Footer do modal */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={enviarSolicitacao}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-purple-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Enviar Solicitação
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === MODAL DE CONFIRMAÇÃO DE EXCLUSÃO === */}
        {pontoParaExcluir && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => !excluindo && setPontoParaExcluir(null)} />

            <div className="relative z-10 w-full max-w-sm bg-page border border-red-500/20 rounded-3xl shadow-2xl shadow-red-500/10 overflow-hidden animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-5 flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-2xl">
                  <ShieldAlert size={28} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-text-primary font-bold text-lg">Excluir Registro</h3>
                  <p className="text-red-400/70 text-xs mt-0.5">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              {/* Detalhes do ponto */}
              <div className="px-6 py-5 space-y-4">
                <div className="bg-surface/60 border border-border-subtle rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const tipo = pontoParaExcluir.subTipo || pontoParaExcluir.tipo;
                      const cfg = getTipoConfig(tipo);
                      const Icon = cfg.icon;
                      return (
                        <>
                          <div className={`p-2 rounded-lg ${cfg.bg}`}>
                            <Icon size={18} className={cfg.cor} />
                          </div>
                          <div>
                            <p className="text-text-primary font-bold font-mono text-lg">
                              {format(new Date(pontoParaExcluir.dataHora), 'HH:mm')}
                            </p>
                            <p className="text-xs text-text-muted">
                              {format(new Date(pontoParaExcluir.dataHora), 'dd/MM/yyyy')}
                              <span className={`ml-2 font-bold uppercase ${cfg.cor}`}>{cfg.label}</span>
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-200 text-sm leading-relaxed">
                    Esse registro será <strong>removido permanentemente</strong> do seu espelho de ponto. Tem certeza que deseja continuar?
                  </p>
                </div>
              </div>

              {/* Botões */}
              <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPontoParaExcluir(null)}
                  disabled={excluindo}
                  className="py-4 rounded-xl font-bold text-sm bg-elevated-solid hover:bg-elevated-solid text-text-secondary border border-border-input transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarExclusao}
                  disabled={excluindo}
                  className="py-4 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {excluindo ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Trash2 size={16} /> Excluir</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
