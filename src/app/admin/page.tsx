'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  format,
  differenceInMinutes,
  isSameDay,
  getDay,
  eachDayOfInterval,
  getISOWeek,
  getYear,
  differenceInDays,
  isSameMonth,
  isSameYear,
} from 'date-fns';
import {
  LogOut,
  Bell,
  AlertCircle,
  ShieldAlert,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  User,
  FileText,
  Edit2,
  Save,
  X,
  Plane,
  PlusCircle,
  ScrollText,
  LayoutDashboard,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';
import DashboardGraficos from '@/components/DashboardGraficos';
import SeletorLoja from '@/components/SeletorLoja';
import ModalEditarJornada from '@/components/ModalEditarJornada';

const SOM_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export default function AdminDashboard() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState<any>({
    nome: 'Carregando...',
    cnpj: '',
    configuracoes: { ocultar_menu_atestados: false },
  });
  const [loading, setLoading] = useState(true);

  const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);
  const [pendenciasAjuste, setPendenciasAjuste] = useState(0);
  const [pendenciasAusencia, setPendenciasAusencia] = useState(0);

  const [alertaFinanceiro, setAlertaFinanceiro] = useState<{
    tipo: 'BLOQUEIO' | 'VENCIDO' | 'PROXIMO';
    dias: number;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [modalAusenciaAberto, setModalAusenciaAberto] = useState(false);
  const [modalJornadaAberto, setModalJornadaAberto] = useState(false);

  const [pontoEmEdicao, setPontoEmEdicao] = useState<any>(null);
  const [novaHora, setNovaHora] = useState('');
  const [motivoEdicao, setMotivoEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [ausenciaUser, setAusenciaUser] = useState('');
  const [ausenciaTipo, setAusenciaTipo] = useState('FERIAS');
  const [ausenciaInicio, setAusenciaInicio] = useState('');
  const [ausenciaFim, setAusenciaFim] = useState('');
  const [ausenciaMotivo, setAusenciaMotivo] = useState('');
  const [salvandoAusencia, setSalvandoAusencia] = useState(false);

  useEffect(() => {
    carregarDados();
    audioRef.current = new Audio(SOM_URL);
    audioRef.current.volume = 0.6;
  }, []);

  useEffect(() => {
    const total = pendenciasAjuste + pendenciasAusencia;
    if (total > 0) {
      setNotificacaoVisivel(true);
      if (audioRef.current) audioRef.current.play().catch(() => {});
      const timer = setTimeout(() => setNotificacaoVisivel(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [pendenciasAjuste, pendenciasAusencia]);

  const carregarDados = async () => {
    try {
      const [
        resPontos,
        resAusencias,
        resUsers,
        resSolicitacoes,
        resPendencias,
        resFeriados,
        resEmpresa,
      ] = await Promise.all([
        axios.get('/api/admin/pontos-todos'),
        axios.get('/api/admin/ausencias-aprovadas'),
        axios.get('/api/admin/funcionarios'),
        axios.get('/api/admin/solicitacoes'),
        axios.get('/api/admin/ausencias'),
        axios.get('/api/admin/feriados'),
        axios.get('/api/admin/empresa'),
      ]);

      setUsuarios(resUsers.data);
      setFeriados(resFeriados.data.map((f: any) => format(new Date(f.data), 'yyyy-MM-dd')));
      setEmpresa(resEmpresa.data);
      setPendenciasAjuste(resSolicitacoes.data.length);
      setPendenciasAusencia(resPendencias.data.length);

      const dadosEmpresa = resEmpresa.data;

      if (!dadosEmpresa.matrizId) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const ultimoPag = dadosEmpresa.dataUltimoPagamento
          ? new Date(dadosEmpresa.dataUltimoPagamento)
          : null;
        const isPago = ultimoPag && isSameMonth(ultimoPag, hoje) && isSameYear(ultimoPag, hoje);

        if (!isPago) {
          const diaVenc = dadosEmpresa.diaVencimento ? parseInt(dadosEmpresa.diaVencimento) : 15;
          let dataVencimento = new Date();
          dataVencimento.setDate(diaVenc);
          dataVencimento.setHours(0, 0, 0, 0);

          const diffDias = differenceInDays(dataVencimento, hoje);

          if (diffDias <= -10) {
            setAlertaFinanceiro({ tipo: 'BLOQUEIO', dias: Math.abs(diffDias) });
          } else if (diffDias < 0) {
            setAlertaFinanceiro({ tipo: 'VENCIDO', dias: Math.abs(diffDias) });
          } else if (diffDias >= 0 && diffDias <= 5) {
            setAlertaFinanceiro({ tipo: 'PROXIMO', dias: diffDias });
          } else {
            setAlertaFinanceiro(null);
          }
        } else {
          setAlertaFinanceiro(null);
        }
      } else {
        setAlertaFinanceiro(null);
      }

      const listaUnificada: any[] = [];
      resPontos.data.forEach((p: any) => {
        listaUnificada.push({
          id: p.id,
          dataHora: p.dataHora,
          tipo: 'PONTO',
          subTipo: p.tipo,
          descricao: p.endereco,
          usuario: p.usuario,
          extra: { fotoUrl: p.fotoUrl },
        });
      });
      resAusencias.data.forEach((a: any) => {
        listaUnificada.push({
          id: a.id,
          dataHora: a.dataInicio,
          tipo: 'AUSENCIA',
          subTipo: a.tipo,
          descricao: a.motivo,
          usuario: a.usuario,
          extra: { comprovanteUrl: a.comprovanteUrl, dataFim: a.dataFim },
        });
      });
      listaUnificada.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
      setRegistros(listaUnificada);
    } catch (error) {
      console.error('Erro ao carregar', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalEdicao = (ponto: any) => {
    setPontoEmEdicao(ponto);
    setNovaHora(format(new Date(ponto.dataHora), 'HH:mm'));
    setMotivoEdicao('');
    setModalEdicaoAberto(true);
  };

  const salvarEdicaoPonto = async () => {
    if (!novaHora || !pontoEmEdicao) return;
    setSalvandoEdicao(true);
    try {
      const dataOriginal = format(new Date(pontoEmEdicao.dataHora), 'yyyy-MM-dd');
      const dataHoraFinal = new Date(`${dataOriginal}T${novaHora}:00`);
      await axios.put('/api/admin/ponto/editar', {
        id: pontoEmEdicao.id,
        novoHorario: dataHoraFinal.toISOString(),
        motivo: motivoEdicao,
      });
      alert('Horário corrigido!');
      setModalEdicaoAberto(false);
      carregarDados();
    } catch (error) {
      alert('Erro ao editar.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const excluirPonto = async (ponto: any) => {
    const motivo = window.prompt(
      '⚠️ ATENÇÃO: Essa ação não pode ser desfeita.\n\nPara excluir, digite o MOTIVO da exclusão:',
    );
    if (motivo === null) return;
    if (motivo.trim() === '') {
      alert('O motivo é obrigatório para registrar nos logs de auditoria.');
      return;
    }
    try {
      await axios.delete('/api/admin/ponto/excluir', { data: { id: ponto.id, motivo: motivo } });
      alert('Registro excluído.');
      carregarDados();
    } catch (error) {
      alert('Erro ao excluir registro.');
    }
  };

  const abrirModalAusencia = () => {
    setAusenciaUser('');
    setAusenciaTipo('FERIAS');
    setAusenciaInicio('');
    setAusenciaFim('');
    setAusenciaMotivo('');
    setModalAusenciaAberto(true);
  };

  const salvarAusenciaAdmin = async () => {
    if (!ausenciaUser || !ausenciaInicio) return alert('Preencha funcionário e data de início.');
    setSalvandoAusencia(true);
    try {
      await axios.post('/api/admin/ausencias/criar', {
        usuarioId: ausenciaUser,
        tipo: ausenciaTipo,
        dataInicio: ausenciaInicio,
        dataFim: ausenciaFim || ausenciaInicio,
        motivo: ausenciaMotivo,
      });
      alert('Lançamento realizado!');
      setModalAusenciaAberto(false);
      carregarDados();
    } catch (error) {
      alert('Erro ao lançar.');
    } finally {
      setSalvandoAusencia(false);
    }
  };

  const registrosFiltrados = registros.filter((r) => {
    if (filtroUsuario && r.usuario.id !== filtroUsuario) return false;
    if (r.tipo === 'PONTO') {
      const diaPonto = format(new Date(r.dataHora), 'yyyy-MM-dd');
      return diaPonto >= dataInicio && diaPonto <= dataFim;
    }
    if (r.tipo === 'AUSENCIA') {
      const iniAus = format(new Date(r.dataHora), 'yyyy-MM-dd');
      const fimAus = r.extra?.dataFim ? format(new Date(r.extra.dataFim), 'yyyy-MM-dd') : iniAus;
      return iniAus <= dataFim && fimAus >= dataInicio;
    }
    return false;
  });

  // ===================== CÁLCULO DE ESTATÍSTICAS =====================
  const calcularEstatisticas = () => {
    if (!filtroUsuario) return null;
    const agora = new Date();

    const pontosUsuario = registros.filter((r) => r.usuario.id === filtroUsuario && r.tipo === 'PONTO');
    const pontosOrdenados = [...pontosUsuario].sort(
      (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
    );

    const semanasComSabado = new Set<string>();
    pontosUsuario.forEach((p) => {
      const data = new Date(p.dataHora);
      if (getDay(data) === 6) {
        const chaveSemana = `${getYear(data)}-${getISOWeek(data)}`;
        semanasComSabado.add(chaveSemana);
      }
    });

    const usuarioInfo = usuarios.find((u) => u.id === filtroUsuario);
    const jornadaConfig = usuarioInfo?.jornada || {};

    const fixData = (d: any) => {
      if (!d) return new Date();
      const str = typeof d === 'string' ? d : d.toISOString();
      const [ano, mes, dia] = str.split('T')[0].split('-').map(Number);
      return new Date(ano, mes - 1, dia, 12, 0, 0);
    };

    const diasIsentos = new Set<string>();
    const ausencias = registros.filter((r) => r.usuario.id === filtroUsuario && r.tipo === 'AUSENCIA');
    ausencias.forEach((aus) => {
      const inicio = fixData(aus.dataHora);
      const fim = aus.extra?.dataFim ? fixData(aus.extra.dataFim) : inicio;
      try {
        eachDayOfInterval({ start: inicio, end: fim }).forEach((dia) => {
          diasIsentos.add(format(dia, 'yyyy-MM-dd'));
        });
      } catch (e) {}
    });

    const getMetaDoDia = (data: Date) => {
      const dataString = format(data, 'yyyy-MM-dd');
      if (feriados.includes(dataString) || diasIsentos.has(dataString)) return 0;

      const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const diaSemanaIndex = getDay(data);
      const diaSemana = diasMap[diaSemanaIndex];

      const chaveSemanaAtual = `${getYear(data)}-${getISOWeek(data)}`;
      const trabalhouSabado = semanasComSabado.has(chaveSemanaAtual);

      if (diaSemanaIndex >= 1 && diaSemanaIndex <= 5) {
        if (trabalhouSabado) return 480;
      }
      if (diaSemanaIndex === 6) {
        if (trabalhouSabado) return 240;
      }

      const config = jornadaConfig[diaSemana];
      if (!config || !config.ativo) return 0;

      const calcDiff = (i: string, f: string) => {
        if (!i || !f) return 0;
        const [h1, m1] = i.split(':').map(Number);
        const [h2, m2] = f.split(':').map(Number);
        let diff = h2 * 60 + m2 - (h1 * 60 + m1);
        if (diff < 0) diff += 1440;
        return diff;
      };

      return calcDiff(config.e1, config.s1) + calcDiff(config.e2, config.s2);
    };

    let minutosHoje = 0;
    let minutosTotalPeriodo = 0; 
    let statusAtual = 'Ausente';
    let tempoDecorridoAgora = 0;

    const contagemDia: Record<string, number> = {};
    const minutosPorDia: Record<string, number> = {};

    // LOOP PRINCIPAL DE CÁLCULO
    for (let i = 0; i < pontosOrdenados.length; i++) {
      const pEntrada = pontosOrdenados[i];
      const tipoEntrada = pEntrada.subTipo || pEntrada.tipo;
      
      if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipoEntrada)) {
        const dataEntradaReal = new Date(pEntrada.dataHora);
        const diaStr = format(dataEntradaReal, 'yyyy-MM-dd');
        
        if (!contagemDia[diaStr]) contagemDia[diaStr] = 0;
        const parIndex = contagemDia[diaStr];
        contagemDia[diaStr]++;

        const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][getDay(dataEntradaReal)];
        const configDia = jornadaConfig[diaSemana] || {};

        // Identifica qual é o horário meta dessa SAÍDA específica
        // parIndex 0 = primeiro turno (almoço), parIndex 1 = segundo turno (saída final)
        const metaSaidaStr = parIndex === 0 ? configDia.s1 : configDia.s2;

        const pSaida = pontosOrdenados[i + 1];
        const tipoSaida = pSaida ? pSaida.subTipo || pSaida.tipo : null;

        if (pSaida && ['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
          const dataSaidaReal = new Date(pSaida.dataHora);
          
          // Cálculo BRUTO inicial
          let diff = differenceInMinutes(dataSaidaReal, dataEntradaReal);

          // === REGRA ESPECIAL DE SAÍDA (PEDIDO DO USUÁRIO) ===
          // Se for o horário de saída final (s2) e o funcionário bateu até 10 min depois:
          // Ignora esses minutos extras.
          // Obs: Verifica se metaSaidaStr existe e se é igual a s2 (final do dia)
          if (metaSaidaStr && metaSaidaStr === configDia.s2) {
              const [hMeta, mMeta] = metaSaidaStr.split(':').map(Number);
              const dataMetaSaida = new Date(dataSaidaReal);
              dataMetaSaida.setHours(hMeta, mMeta, 0, 0);

              const atrasoSaida = differenceInMinutes(dataSaidaReal, dataMetaSaida);
              
              // Se o atraso for positivo (saiu depois) E menor ou igual a 10 min
              if (atrasoSaida > 0 && atrasoSaida <= 10) {
                  // Subtrai esse "excesso" do tempo trabalhado, "fingindo" que ele saiu na hora
                  diff -= atrasoSaida;
              }
          }
          // ====================================================

          if (diff > 0 && diff < 1440) {
            minutosPorDia[diaStr] = (minutosPorDia[diaStr] || 0) + diff;
            
            if (diaStr >= dataInicio && diaStr <= dataFim) minutosTotalPeriodo += diff;
            if (isSameDay(dataEntradaReal, agora)) minutosHoje += diff;
          }

          if (tipoSaida === 'SAIDA_INTERVALO') {
            const pProximaEntrada = pontosOrdenados[i + 2];
            if (pProximaEntrada && ['VOLTA_INTERVALO', 'PONTO'].includes(pProximaEntrada.subTipo || pProximaEntrada.tipo)) {
              const dataVolta = new Date(pProximaEntrada.dataHora);
              const duracaoIntervalo = differenceInMinutes(dataVolta, dataSaidaReal);
              const creditoCafe = Math.min(duracaoIntervalo, 15);

              if (creditoCafe > 0) {
                minutosPorDia[diaStr] = (minutosPorDia[diaStr] || 0) + creditoCafe;
                if (diaStr >= dataInicio && diaStr <= dataFim) minutosTotalPeriodo += creditoCafe;
                if (isSameDay(dataEntradaReal, agora)) minutosHoje += creditoCafe;
              }
            }
          }
          i++;
        } else {
          // Ponto em aberto (Trabalhando agora)
          if (isSameDay(dataEntradaReal, agora)) {
            const diff = differenceInMinutes(agora, dataEntradaReal);
            if (diff > 0 && diff < 1440) {
              minutosHoje += diff;
              statusAtual = 'Trabalhando';
              tempoDecorridoAgora = diff;
              // No "tempo real" não aplicamos corte ainda, pois ele não bateu o ponto
              minutosPorDia[diaStr] = (minutosPorDia[diaStr] || 0) + diff;
              if (diaStr >= dataInicio && diaStr <= dataFim) minutosTotalPeriodo += diff;
            }
          }
        }
      }
    }

    if (pontosOrdenados.length > 0) {
      const ultimoPonto = pontosOrdenados[pontosOrdenados.length - 1];
      if (ultimoPonto.subTipo === 'SAIDA_INTERVALO' && isSameDay(new Date(ultimoPonto.dataHora), agora)) {
        const dataSaida = new Date(ultimoPonto.dataHora);
        const tempoNoIntervalo = differenceInMinutes(agora, dataSaida);
        const creditoAtual = Math.min(tempoNoIntervalo, 15);

        statusAtual = tempoNoIntervalo <= 15 ? 'Pausa Café (Pago)' : 'Pausa Café (Excedido)';
        tempoDecorridoAgora = tempoNoIntervalo;

        minutosHoje += creditoAtual;
        const diaStr = format(agora, 'yyyy-MM-dd');
        minutosPorDia[diaStr] = (minutosPorDia[diaStr] || 0) + creditoAtual;
        
        const hojeStr = format(agora, 'yyyy-MM-dd');
        if (hojeStr >= dataInicio && hojeStr <= dataFim) minutosTotalPeriodo += creditoAtual;
      }
    }

    let saldoMinutosBanco = 0;
    let loopData = criarDataLocal(dataInicio);
    const fimData = criarDataLocal(dataFim);

    while (loopData <= fimData) {
      if (loopData <= agora) {
        const dataStr = format(loopData, 'yyyy-MM-dd');
        const meta = getMetaDoDia(loopData);
        const trabalhado = minutosPorDia[dataStr] || 0;
        
        let saldoDia = trabalhado - meta;

        // Tolerância CLT Global do Dia (Soma tudo e verifica se excede 10)
        if (Math.abs(saldoDia) <= 10) {
           saldoDia = 0;
        }

        saldoMinutosBanco += saldoDia;
      }
      loopData.setDate(loopData.getDate() + 1);
    }

    const formatarHoras = (min: number) => {
      const sinal = min < 0 ? '-' : '';
      const absMin = Math.abs(min);
      return `${sinal}${Math.floor(absMin / 60)}h ${absMin % 60}m`;
    };

    return {
      status: statusAtual,
      tempoAgora: formatarHoras(tempoDecorridoAgora).replace('-', ''),
      hoje: formatarHoras(minutosHoje),
      metaHoje: formatarHoras(getMetaDoDia(agora)),
      total: formatarHoras(minutosTotalPeriodo), 
      saldo: formatarHoras(saldoMinutosBanco),   
      saldoPositivo: saldoMinutosBanco >= 0,
    };
  };

  const stats = calcularEstatisticas();
  const configs = empresa.configuracoes || {};

  if (loading)
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400 gap-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        Carregando painel...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-purple-500/30 relative overflow-x-hidden">
      {/* Efeitos de Fundo */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* NOTIFICAÇÃO DE FATURA */}
      {/* {alertaFinanceiro && (
        <div className="fixed top-0 left-0 right-0 z-[999] animate-in slide-in-from-top fade-in duration-500">
          {alertaFinanceiro.tipo === 'BLOQUEIO' && (
            <div className="bg-red-600 text-white p-3 flex items-center justify-center gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <Lock className="animate-pulse" size={20} />
                <span className="font-bold text-sm uppercase">Bloqueio Iminente!</span>
              </div>
              <span className="text-sm hidden md:inline">
                Sua fatura venceu há {alertaFinanceiro.dias} dias. Regularize para evitar suspensão.
              </span>
              <Link
                href="/admin/perfil"
                className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
              >
                RESOLVER AGORA
              </Link>
            </div>
          )}

          {alertaFinanceiro.tipo === 'VENCIDO' && (
            <div className="bg-orange-600 text-white p-3 flex items-center justify-center gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle className="animate-bounce" size={20} />
                <span className="font-bold text-sm uppercase">Fatura Vencida</span>
              </div>
              <span className="text-sm hidden md:inline">
                Venceu há {alertaFinanceiro.dias} dia(s). Evite o bloqueio do sistema.
              </span>
              <Link
                href="/admin/perfil"
                className="bg-white text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors"
              >
                PAGAR AGORA
              </Link>
            </div>
          )}

          {alertaFinanceiro.tipo === 'PROXIMO' && (
            <div className="bg-yellow-500 text-black p-3 flex items-center justify-center gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <Clock size={20} />
                <span className="font-bold text-sm uppercase">Fatura em Aberto</span>
              </div>
              <span className="text-sm hidden md:inline">
                Sua fatura vence {alertaFinanceiro.dias === 0 ? 'HOJE' : `em ${alertaFinanceiro.dias} dias`}.
              </span>
              <Link
                href="/admin/perfil"
                className="bg-black text-yellow-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                VER FATURA
              </Link>
            </div>
          )}
        </div>
      )} */}

      {/* Toast */}
      {notificacaoVisivel && (
        <div className={`fixed top-16 right-6 z-[100] animate-in slide-in-from-right duration-500 fade-in ${alertaFinanceiro ? 'mt-12' : ''}`}>
          <Link href={pendenciasAjuste > 0 ? '/admin/solicitacoes' : '/admin/pendencias'}>
            <div className="bg-purple-600 text-white p-4 rounded-xl shadow-2xl border border-purple-400 flex items-center gap-4 cursor-pointer hover:bg-purple-700 hover:scale-105 transition-all">
              <div className="bg-white p-2 rounded-full animate-bounce text-purple-600">
                <Bell size={24} fill="currentColor" />
              </div>
              <div>
                <p className="font-bold text-sm">Novas Pendências!</p>
                <div className="text-xs text-purple-100 flex flex-col">
                  {pendenciasAjuste > 0 && <span>• {pendenciasAjuste} Ajuste(s)</span>}
                  {pendenciasAusencia > 0 && <span>• {pendenciasAusencia} Justificativa(s)</span>}
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className={`max-w-7xl mx-auto p-4 md:p-8 relative z-10 space-y-8 ${alertaFinanceiro ? 'mt-8' : ''}`}>
        {/* === CABEÇALHO === */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
                <LayoutDashboard size={20} className="text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{empresa.nome}</h1>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Painel Administrativo</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="flex-1 xl:flex-none">
              <SeletorLoja empresaAtualId={empresa.id} empresaAtualNome={empresa.nome} />
            </div>

            <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur border border-white/5 p-1.5 rounded-xl">
              <Link href="/admin/perfil" className="p-2.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Minha Conta">
                <User size={18} />
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="p-2.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors" title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* === AÇÕES RÁPIDAS === */}
        <div>
          {/* <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Acesso Rápido</p> */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <button
              onClick={abrirModalAusencia}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all shadow-lg shadow-black/20 hover:-translate-y-1"
            >
              <Plane size={24} />
              <span className="text-xs font-bold">Lançar Ausência</span>
            </button>


            <Link href="/admin/solicitacoes" className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-purple-500/30 hover:-translate-y-1 relative group">
              <div className="bg-purple-500/10 p-2 rounded-full group-hover:bg-purple-500/20 transition-colors">
                <AlertCircle size={20} className="text-purple-400" />
              </div>
              <span className="text-xs font-bold">Ajustes</span>
              {pendenciasAjuste > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-900">
                  {pendenciasAjuste}
                </span>
              )}
            </Link>

            {!configs.ocultar_menu_atestados && (
              <Link href="/admin/pendencias" className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-yellow-500/30 hover:-translate-y-1 relative group">
                <div className="bg-yellow-500/10 p-2 rounded-full group-hover:bg-yellow-500/20 transition-colors">
                  <ShieldAlert size={20} className="text-yellow-400" />
                </div>
                <span className="text-xs font-bold">Atestados</span>
                {pendenciasAusencia > 0 && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-900">
                    {pendenciasAusencia}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/admin/funcionarios"
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:-translate-y-1 group
                        bg-slate-800/60 hover:bg-slate-800
                        text-slate-100
                        border border-white/10 hover:border-white/25
                        ring-1 ring-fuchsia-500/25 hover:ring-fuchsia-400/40
                        shadow-lg shadow-fuchsia-900/10"
            >
              <div className="bg-fuchsia-500/10 p-2 rounded-full group-hover:bg-fuchsia-500/15 transition-colors">
                <User size={20} className="text-fuchsia-300 group-hover:text-fuchsia-200" />
              </div>

              <span className="text-xs font-bold">Gestão da Equipe</span>
            </Link>


            <Link href="/admin/feriados" className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-white/20 hover:-translate-y-1 group">
              <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
                <CalendarDays size={20} className="text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-xs font-bold">Feriados</span>
            </Link>

            <Link href="/admin/logs" className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-white/20 hover:-translate-y-1 group">
              <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
                <ScrollText size={20} className="text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-xs font-bold">Auditoria</span>
            </Link>

            <Link href="/admin/dashboard" className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 rounded-2xl transition-all hover:border-white/20 hover:-translate-y-1 group">
              <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
                <LayoutDashboard size={20} className="text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-xs font-bold">Visão Geral</span>
            </Link>
          </div>
        </div>

        {/* === FILTROS === */}
        <div className="relative z-20 bg-slate-900/60 backdrop-blur-xl border border-white/5 p-5 rounded-3xl shadow-xl flex flex-col lg:flex-row gap-6 items-end">
          <div className="w-full lg:flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Funcionário</label>
              <div className="flex gap-2">
                <div className="relative flex-1 group">
                  <Search size={16} className="absolute left-3 top-3.5 text-slate-500 group-hover:text-purple-400 transition-colors pointer-events-none" />
                  <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 hover:border-purple-500/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all appearance-none cursor-pointer">
                    <option value="">Todos os Funcionários</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </div>
                {filtroUsuario && (
                  <button onClick={() => setModalJornadaAberto(true)} className="px-3 bg-slate-800 hover:bg-purple-600 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-colors" title="Configurar Escala">
                    <Clock size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Período</label>
              <div className="flex gap-2 items-center bg-slate-950/50 border border-white/10 rounded-xl p-1">
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent text-sm text-slate-300 outline-none p-2 w-full text-center cursor-pointer hover:text-white transition-colors" />
                <span className="text-slate-600 text-xs">até</span>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent text-sm text-slate-300 outline-none p-2 w-full text-center cursor-pointer hover:text-white transition-colors" />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto">
            <BotaoRelatorio
              pontos={registrosFiltrados}
              filtro={{ inicio: criarDataLocal(dataInicio), fim: criarDataLocal(dataFim), usuario: filtroUsuario ? usuarios.find((u) => u.id === filtroUsuario)?.nome : 'Todos' }}
              resumoHoras={stats}
              assinaturaUrl={filtroUsuario ? (usuarios.find((u) => u.id === filtroUsuario) as any)?.assinaturaUrl : null}
              nomeEmpresa={empresa.nome}
              dadosEmpresaCompleto={empresa}
            />
          </div>
        </div>

        {/* === CARDS === */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${stats.status.includes('Trabalhando') || stats.status.includes('Pausa Café (Pago)') ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-900/50 border-white/5'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status Atual</h3>
                <span className={`w-2 h-2 rounded-full ${stats.status.includes('Trabalhando') || stats.status.includes('Pausa Café (Pago)') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              </div>
              <p className={`text-xl font-bold ${stats.status.includes('Trabalhando') || stats.status.includes('Pausa Café (Pago)') ? 'text-emerald-400' : 'text-slate-500'}`}>{stats.status}</p>
              {stats.status !== 'Ausente' && <p className="text-xs text-emerald-400/60 mt-1 font-mono">Tempo: {stats.tempoAgora}</p>}
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Hoje</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{stats.hoje}</p>
                <p className="text-[10px] text-slate-500">/ Meta: {stats.metaHoje}</p>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Total Período</h3>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>

            {!configs.ocultarSaldoHoras ? (
              <div className={`p-5 rounded-2xl border backdrop-blur-md shadow-lg ${stats.saldoPositivo ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                <h3 className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 mb-2">
                  {stats.saldoPositivo ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
                  <span className={stats.saldoPositivo ? 'text-emerald-500' : 'text-rose-500'}>Banco</span>
                </h3>
                <p className={`text-3xl font-bold ${stats.saldoPositivo ? 'text-emerald-400' : 'text-rose-400'}`}>{stats.saldo}</p>
              </div>
            ) : (
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 flex items-center justify-center opacity-50">
                <p className="text-xs text-slate-500">Saldo Oculto</p>
              </div>
            )}
          </div>
        )}

        {/* === TABELA DE REGISTROS === */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="hidden md:grid grid-cols-5 bg-slate-950/50 p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
             <div className="pl-2">Funcionário</div>
             <div>Data</div>
             <div>Hora / Tipo</div>
             <div>Local / Motivo</div>
             <div className="text-right pr-2">Comprovante</div>
          </div>

          <div className="divide-y divide-white/5">
            {registrosFiltrados.length > 0 ? registrosFiltrados.map((reg) => (
              <div key={reg.id} className={`p-4 flex flex-col md:grid md:grid-cols-5 md:items-center gap-3 transition-all hover:bg-white/[0.02] group ${reg.tipo === 'AUSENCIA' ? 'bg-yellow-900/5 hover:bg-yellow-900/10' : ''}`}>
                
                {/* User */}
                <div className="flex items-center gap-3 pl-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${reg.tipo === 'AUSENCIA' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-purple-500/20 text-purple-300'}`}>
                        {reg.tipo === 'AUSENCIA' ? <FileText size={16}/> : <User size={16} />}
                    </div>
                    <div>
                        <p className="font-bold text-slate-200 text-sm">{reg.usuario.nome}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{reg.usuario.email}</p>
                    </div>
                </div>

                {/* Data */}
                <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={14} className="md:hidden text-slate-500" />
                    <span className="text-sm font-semibold tracking-tight">{format(new Date(reg.dataHora), 'dd/MM/yyyy')}</span>
                    {reg.tipo === 'AUSENCIA' && reg.extra?.dataFim && reg.extra.dataFim !== reg.dataHora && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">até {format(new Date(reg.extra.dataFim), 'dd/MM')}</span>
                    )}
                </div>
                
                {/* Hora / Tipo */}
                <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                  {reg.tipo === 'PONTO' ? (
                    <>
                        <span className="text-sm font-bold text-emerald-400 font-mono bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/20">
                            {format(new Date(reg.dataHora), 'HH:mm')}
                        </span>
                        
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{reg.subTipo?.replace('_', ' ')}</span>
                            
                            {/* === CORREÇÃO AQUI: Botões sempre visíveis no mobile, hover no desktop === */}
                            <div className="flex gap-3 mt-1 md:gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => abrirModalEdicao(reg)} 
                                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors text-xs font-bold md:p-1" 
                                    title="Editar"
                                >
                                    <Edit2 size={14} /> <span className="md:hidden">Editar</span>
                                </button>
                                <button 
                                    onClick={() => excluirPonto(reg)} 
                                    className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors text-xs font-bold md:p-1" 
                                    title="Excluir"
                                >
                                    <Trash2 size={14} /> <span className="md:hidden">Excluir</span>
                                </button>
                            </div>
                        </div>
                    </>
                  ) : (
                    <span className="text-xs font-bold bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 px-2 py-1 rounded uppercase tracking-wider">{reg.subTipo?.replace('_', ' ')}</span>
                  )}
                </div>

                {/* Local */}
                <div className="flex items-center gap-2 text-slate-400 text-xs truncate pr-4">
                    {reg.descricao ? (
                        <span className="truncate" title={reg.descricao}>{reg.descricao}</span>
                    ) : (
                        <span className="italic opacity-50">{reg.tipo === 'PONTO' ? (reg.extra?.fotoUrl ? 'GPS + Foto' : 'GPS') : '-'}</span>
                    )}
                </div>
                
                {/* Comprovante */}
                <div className="md:text-right pr-2">
                    {reg.tipo === 'AUSENCIA' && reg.extra?.comprovanteUrl && (
                        <a href={reg.extra.comprovanteUrl} target="_blank" className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all border border-white/5">
                            <FileText size={12} /> Ver Anexo
                        </a>
                    )}
                </div>

              </div>
            )) : (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600"><Filter size={32}/></div>
                    <p className="text-slate-500 text-sm">Nenhum registro encontrado para este período.</p>
                </div>
            )}
          </div>
        </div>
        

        <div className="mt-8">
          <DashboardGraficos registros={registrosFiltrados} />
        </div>

        {/* === MODAIS === */}
        {modalEdicaoAberto && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 size={20} className="text-purple-400" /> Editar Horário
                </h3>
                <button onClick={() => setModalEdicaoAberto(false)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-bold">Funcionário</p>
                <p className="font-bold text-white text-lg">{pontoEmEdicao?.usuario?.nome}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Novo Horário</label>
                <input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white text-2xl font-bold text-center focus:border-purple-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Motivo</label>
                <input type="text" value={motivoEdicao} onChange={(e) => setMotivoEdicao(e.target.value)} placeholder="Justificativa..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm outline-none focus:border-purple-500" />
              </div>
              <button onClick={salvarEdicaoPonto} disabled={salvandoEdicao || !motivoEdicao} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 transition-all">
                {salvandoEdicao ? 'Salvando...' : (
                  <>
                    <Save size={18} /> Salvar Alteração
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {modalAusenciaAberto && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plane size={20} className="text-blue-400" /> Lançar Ausência
                </h3>
                <button onClick={() => setModalAusenciaAberto(false)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Funcionário</label>
                <select value={ausenciaUser} onChange={(e) => setAusenciaUser(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm">
                  <option value="">Selecione...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Tipo</label>
                  <select value={ausenciaTipo} onChange={(e) => setAusenciaTipo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-white text-xs">
                    <option value="FERIAS">Férias</option>
                    <option value="FOLGA">Folga / Abono</option>
                    <option value="FALTA_JUSTIFICADA">Atestado Médico</option>
                    <option value="SUSPENSAO">Suspensão</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Início</label>
                  <input type="date" value={ausenciaInicio} onChange={(e) => setAusenciaInicio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-white text-xs text-center" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Fim (Opcional)</label>
                <input type="date" value={ausenciaFim} onChange={(e) => setAusenciaFim(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-white text-sm text-center" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold">Observação</label>
                <textarea value={ausenciaMotivo} onChange={(e) => setAusenciaMotivo(e.target.value)} placeholder="Ex: Férias coletivas..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm h-20 resize-none" />
              </div>
              <button onClick={salvarAusenciaAdmin} disabled={salvandoAusencia} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 transition-all">
                {salvandoAusencia ? 'Lançando...' : (
                  <>
                    <PlusCircle size={18} /> Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {modalJornadaAberto && filtroUsuario && (
          <ModalEditarJornada
            usuario={usuarios.find((u) => u.id === filtroUsuario)}
            aoFechar={() => setModalJornadaAberto(false)}
            aoSalvar={carregarDados}
          />
        )}
      </div>
    </div>
  );
}