'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format, differenceInMinutes, startOfWeek, startOfMonth, startOfYear, isSameDay, isAfter, getDay } from 'date-fns';
import { LogOut, MapPin, User, Calendar, Clock, ExternalLink, AlertCircle, LayoutDashboard, Bell, ShieldAlert, FileText, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react'; 
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';
import DashboardGraficos from '@/components/DashboardGraficos';

// SOM DE NOTIFICAÇÃO (Base64 curto para garantir que toque sempre)
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder curto
// Vamos usar um link externo confiável ou você pode substituir pelo base64 real se preferir
const SOM_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

interface RegistroUnificado {
  id: string;
  dataHora: string;
  tipo: 'PONTO' | 'AUSENCIA';
  subTipo?: string;
  descricao?: string;
  usuario: { id: string; nome: string; email: string; tituloCargo?: string; jornada?: any; };
  extra?: any;
}
interface UsuarioResumo { id: string; nome: string; jornada?: any; }

export default function AdminDashboard() {
  const [registros, setRegistros] = useState<RegistroUnificado[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // === ESTADOS DE NOTIFICAÇÃO ===
  const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);
  const [pendenciasAjuste, setPendenciasAjuste] = useState(0); // Cobre Ajustes + Esqueci de Bater
  const [pendenciasAusencia, setPendenciasAusencia] = useState(0); // Cobre Atestados/Faltas
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { 
    carregarDados();
    // Inicializa o áudio
    audioRef.current = new Audio(SOM_URL);
    audioRef.current.volume = 0.6;
  }, []);

  // === MONITOR DE PENDÊNCIAS (DISPARA SOM E ALERTA) ===
  useEffect(() => {
    const total = pendenciasAjuste + pendenciasAusencia;
    
    if (total > 0) {
        setNotificacaoVisivel(true);
        
        // Tenta tocar o som (navegadores exigem interação prévia as vezes, mas no admin geralmente funciona)
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Som bloqueado pelo navegador (necessário clique):", e));
        }

        // Esconde o alerta visual depois de 8 segundos, mas os badges vermelhos continuam
        const timer = setTimeout(() => setNotificacaoVisivel(false), 8000);
        return () => clearTimeout(timer);
    }
  }, [pendenciasAjuste, pendenciasAusencia]); // Roda sempre que esses números mudam

  const carregarDados = async () => {
    try {
      const [resPontos, resAusencias, resUsers, resSolicitacoes, resPendencias, resFeriados] = await Promise.all([
        axios.get('/api/admin/pontos-todos'),
        axios.get('/api/admin/ausencias-aprovadas'),
        axios.get('/api/admin/funcionarios'),
        axios.get('/api/admin/solicitacoes'), // Retorna Ajustes E Inclusões (Esqueci)
        axios.get('/api/admin/ausencias'),    // Retorna Atestados Pendentes
        axios.get('/api/admin/feriados')
      ]);

      setUsuarios(resUsers.data);
      const listaFeriados = resFeriados.data.map((f: any) => format(new Date(f.data), 'yyyy-MM-dd'));
      setFeriados(listaFeriados);

      // Atualiza os contadores (Isso vai disparar o useEffect acima)
      setPendenciasAjuste(resSolicitacoes.data.length);
      setPendenciasAusencia(resPendencias.data.length);

      const listaUnificada: RegistroUnificado[] = [];
      resPontos.data.forEach((p: any) => {
        listaUnificada.push({
          id: p.id, dataHora: p.dataHora, tipo: 'PONTO', subTipo: p.tipo, descricao: p.endereco,
          usuario: p.usuario, extra: { fotoUrl: p.fotoUrl }
        });
      });
      resAusencias.data.forEach((a: any) => {
        listaUnificada.push({
          id: a.id, dataHora: a.dataInicio, tipo: 'AUSENCIA', subTipo: a.tipo, descricao: a.motivo,
          usuario: a.usuario, extra: { comprovanteUrl: a.comprovanteUrl, dataFim: a.dataFim }
        });
      });
      listaUnificada.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
      setRegistros(listaUnificada);

    } catch (error) { console.error("Erro ao carregar", error); } finally { setLoading(false); }
  };

  const registrosFiltrados = registros.filter(r => {
    const dataReg = format(new Date(r.dataHora), 'yyyy-MM-dd');
    return dataReg >= dataInicio && dataReg <= dataFim && (filtroUsuario ? r.usuario.id === filtroUsuario : true);
  });

  const calcularEstatisticas = () => {
    if (!filtroUsuario) return null;

    const agora = new Date();
    const pontosDoUsuario = registros.filter(r => r.usuario.id === filtroUsuario && r.tipo === 'PONTO');
    const usuarioInfo = usuarios.find(u => u.id === filtroUsuario);
    const jornadaConfig = usuarioInfo?.jornada || {};

    const pontosOrdenados = [...pontosDoUsuario].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    let minutosHoje = 0;
    let minutosTotalPeriodo = 0;
    let minutosEsperadosPeriodo = 0;
    let statusAtual = "Ausente";
    let tempoDecorridoAgora = 0;

    const getMetaDoDia = (data: Date) => {
        const dataString = format(data, 'yyyy-MM-dd');
        if (feriados.includes(dataString)) return 0;

        const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const diaSemana = diasMap[getDay(data)];
        const config = jornadaConfig[diaSemana];
        if (!config || !config.ativo) return 0;

        const calcDiff = (i:string, f:string) => {
            if(!i || !f) return 0;
            const [h1, m1] = i.split(':').map(Number);
            const [h2, m2] = f.split(':').map(Number);
            return (h2*60 + m2) - (h1*60 + m1);
        };
        return calcDiff(config.e1, config.s1) + calcDiff(config.e2, config.s2);
    };

    const pontosPorDia: Record<string, typeof pontosOrdenados> = {};
    pontosOrdenados.forEach(p => {
      const dia = format(new Date(p.dataHora), 'yyyy-MM-dd');
      if (!pontosPorDia[dia]) pontosPorDia[dia] = [];
      pontosPorDia[dia].push(p);
    });

    Object.keys(pontosPorDia).forEach(dia => {
      const batidas = pontosPorDia[dia];
      let minutosNoDia = 0;
      for (let i = 0; i < batidas.length; i += 2) {
        const entrada = new Date(batidas[i].dataHora);
        const saida = batidas[i+1] ? new Date(batidas[i+1].dataHora) : null;
        if (saida) minutosNoDia += differenceInMinutes(saida, entrada);
        else if (isSameDay(entrada, agora)) {
             const trab = differenceInMinutes(agora, entrada);
             minutosNoDia += trab;
             statusAtual = "Trabalhando";
             tempoDecorridoAgora = trab;
        }
      }
      if (isSameDay(criarDataLocal(dia), agora)) minutosHoje += minutosNoDia;
      if (dia >= dataInicio && dia <= dataFim) minutosTotalPeriodo += minutosNoDia;
    });

    let loopData = criarDataLocal(dataInicio);
    const fimData = criarDataLocal(dataFim);
    while (loopData <= fimData) {
        if (loopData <= agora) minutosEsperadosPeriodo += getMetaDoDia(loopData);
        loopData.setDate(loopData.getDate() + 1);
    }

    const formatarHoras = (min: number) => {
        const sinal = min < 0 ? '-' : '';
        const absMin = Math.abs(min);
        return `${sinal}${Math.floor(absMin / 60)}h ${absMin % 60}m`;
    };
    const saldoMinutos = minutosTotalPeriodo - minutosEsperadosPeriodo;

    return {
      status: statusAtual,
      tempoAgora: statusAtual === "Trabalhando" ? formatarHoras(tempoDecorridoAgora) : "--",
      hoje: formatarHoras(minutosHoje),
      metaHoje: formatarHoras(getMetaDoDia(agora)),
      total: formatarHoras(minutosTotalPeriodo),
      saldo: formatarHoras(saldoMinutos),
      saldoPositivo: saldoMinutos >= 0
    };
  };

  const stats = calcularEstatisticas();

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 relative">
      
      {/* === TOAST DE NOTIFICAÇÃO UNIFICADO === */}
      {notificacaoVisivel && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right duration-500 fade-in">
            {/* Link inteligente: Se tiver só atestado, vai pra atestado. Se tiver ajuste ou ambos, vai pra ajustes. */}
            <Link href={pendenciasAjuste > 0 ? "/admin/solicitacoes" : "/admin/pendencias"}>
                <div className="bg-purple-600 text-white p-4 rounded-xl shadow-2xl border border-purple-400 flex items-center gap-4 cursor-pointer hover:bg-purple-700 transition-transform hover:scale-105">
                <div className="bg-white p-2 rounded-full animate-bounce text-purple-600"><Bell size={24} fill="currentColor" /></div>
                <div>
                    <p className="font-bold text-sm">Novas Pendências!</p>
                    <div className="text-xs text-purple-100 flex flex-col">
                        {pendenciasAjuste > 0 && <span>• {pendenciasAjuste} Ajuste(s) de Ponto</span>}
                        {pendenciasAusencia > 0 && <span>• {pendenciasAusencia} Justificativa(s)</span>}
                    </div>
                </div>
                </div>
            </Link>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-purple-400">WorkID Admin</h1>
            <p className="text-slate-400 text-sm">Visão Geral da Empresa</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            
            {/* Botão Ajustes (Inclui "Esqueci de Bater") */}
            <Link href="/admin/solicitacoes" className="px-4 py-2 bg-purple-900/50 text-purple-300 border border-purple-800 rounded-lg hover:bg-purple-900 transition text-sm flex items-center gap-2 relative">
              <AlertCircle size={16} /> Ajustes
              {pendenciasAjuste > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-950">{pendenciasAjuste}</span>}
            </Link>

            {/* Botão Atestados/Ausências */}
            <Link href="/admin/pendencias" className="px-4 py-2 bg-yellow-900/50 text-yellow-300 border border-yellow-800 rounded-lg hover:bg-yellow-900 transition text-sm flex items-center gap-2 relative">
              <ShieldAlert size={16} /> Atestados
              {pendenciasAusencia > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-950">{pendenciasAusencia}</span>}
            </Link>

            <Link href="/admin/feriados" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700 flex items-center gap-2"><CalendarDays size={16} /> Feriados</Link>
            <Link href="/admin/funcionarios" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700">Equipe</Link>
            <Link href="/admin/perfil" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700">Minha Conta</Link>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-4 py-2 bg-red-900/20 text-red-300 rounded-lg hover:bg-red-900/40 transition text-sm flex items-center gap-2 border border-red-900/30"><LogOut size={16} /> Sair</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Funcionário</label>
            <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm">
              <option value="">Todos os Funcionários</option>
              {usuarios.map(u => (<option key={u.id} value={u.id}>{u.nome}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
            <div><label className="text-xs text-slate-500 mb-1 block">Data Início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"/></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Data Fim</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"/></div>
          </div>
          <div className="w-full md:w-auto">
             <BotaoRelatorio pontos={registrosFiltrados} filtro={{ inicio: criarDataLocal(dataInicio), fim: criarDataLocal(dataFim), usuario: filtroUsuario ? usuarios.find(u=>u.id === filtroUsuario)?.nome : 'Todos' }} resumoHoras={stats} />
          </div>
        </div>

        {/* Cards Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${stats.status === 'Trabalhando' ? 'bg-green-900/20 border-green-800' : 'bg-slate-900 border-slate-800'}`}>
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status Agora</h3>
              <p className={`text-lg font-bold ${stats.status === 'Trabalhando' ? 'text-green-400' : 'text-slate-500'}`}>{stats.status}</p>
              {stats.status === 'Trabalhando' && <p className="text-xs text-green-300 mt-1">⏱ {stats.tempoAgora}</p>}
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hoje</h3>
                <div className="flex items-baseline gap-2"><p className="text-lg font-bold text-white">{stats.hoje}</p><p className="text-[10px] text-slate-500">/ Meta: {stats.metaHoje}</p></div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Trabalhado (Período)</h3>
                <p className="text-lg font-bold text-white">{stats.total}</p>
            </div>
            <div className={`p-4 rounded-xl border ${stats.saldoPositivo ? 'bg-green-900/10 border-green-900' : 'bg-red-900/10 border-red-900'}`}>
                <h3 className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    {stats.saldoPositivo ? <TrendingUp size={14} className="text-green-500"/> : <TrendingDown size={14} className="text-red-500"/>}
                    <span className={stats.saldoPositivo ? 'text-green-500' : 'text-red-500'}>Banco de Horas</span>
                </h3>
                <p className={`text-2xl font-bold ${stats.saldoPositivo ? 'text-green-400' : 'text-red-400'}`}>{stats.saldo}</p>
                <p className="text-[10px] text-slate-500 mt-1">Saldo do período</p>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="mt-6"><DashboardGraficos registros={registrosFiltrados} /></div>

        {/* Lista */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl mt-6">
          <div className="hidden md:grid grid-cols-5 bg-slate-950 p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <div>Funcionário</div><div>Data</div><div>Hora / Tipo</div><div className="col-span-1">Local / Motivo</div><div className="text-right">Comprovante</div>
          </div>
          <div className="divide-y divide-slate-800">
            {registrosFiltrados.length > 0 ? registrosFiltrados.map((reg) => (
              <div key={reg.id} className={`p-4 flex flex-col md:grid md:grid-cols-5 md:items-center gap-3 transition-colors ${reg.tipo === 'AUSENCIA' ? 'bg-yellow-900/10 hover:bg-yellow-900/20' : 'hover:bg-slate-800/30'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${reg.tipo === 'AUSENCIA' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-purple-900/50 text-purple-200'}`}>{reg.tipo === 'AUSENCIA' ? <FileText size={16}/> : <User size={16} />}</div>
                  <div><p className="font-bold text-white text-sm md:text-base">{reg.usuario.nome}</p><div className="flex flex-col md:flex-row gap-1"><p className="text-xs text-slate-500">{reg.usuario.email}</p>{reg.usuario.tituloCargo && <span className="text-[10px] bg-slate-800 px-1.5 rounded text-purple-400 border border-slate-700 md:hidden w-fit">{reg.usuario.tituloCargo}</span>}</div></div>
                </div>
                <div className="flex items-center gap-2 md:block text-slate-300">
                  <Calendar size={14} className="md:hidden text-slate-500" /><span className="text-sm font-bold">{format(new Date(reg.dataHora), 'dd/MM/yyyy')}</span>
                  {reg.tipo === 'AUSENCIA' && reg.extra?.dataFim && reg.extra.dataFim !== reg.dataHora && (<span className="text-[10px] text-slate-500 block">até {format(new Date(reg.extra.dataFim), 'dd/MM')}</span>)}
                </div>
                <div className="flex items-center gap-2 md:block">
                  {reg.tipo === 'PONTO' ? (<><Clock size={14} className="md:hidden text-green-500" /><span className="text-sm font-bold text-green-400">{format(new Date(reg.dataHora), 'HH:mm')}</span><span className="text-[10px] text-slate-500 block uppercase">{reg.subTipo?.replace('_', ' ')}</span></>) : (<span className="text-xs font-bold bg-yellow-600 text-white px-2 py-1 rounded uppercase">{reg.subTipo?.replace('_', ' ')}</span>)}
                </div>
                <div className="flex items-start gap-2 md:block col-span-1">
                  <span className="text-xs text-slate-400 block break-words" title={reg.descricao}>{reg.descricao ? (reg.descricao.length > 40 ? reg.descricao.substring(0, 40) + '...' : reg.descricao) : (reg.tipo === 'PONTO' ? `${reg.extra?.fotoUrl ? 'GPS + Foto' : 'GPS'}` : '-')}</span>
                </div>
                <div className="md:text-right mt-2 md:mt-0">
                  {reg.tipo === 'PONTO' && reg.extra?.fotoUrl && (<a href={reg.extra.fotoUrl} target="_blank" className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600/10 text-purple-400 border border-purple-600/30 rounded text-xs font-bold hover:bg-purple-600 hover:text-white transition-all"><ExternalLink size={12} /> Ver Foto</a>)}
                  {reg.tipo === 'AUSENCIA' && reg.extra?.comprovanteUrl && (<a href={reg.extra.comprovanteUrl} target="_blank" className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-yellow-600/10 text-yellow-400 border border-yellow-600/30 rounded text-xs font-bold hover:bg-yellow-600 hover:text-white transition-all"><FileText size={12} /> Ver Atestado</a>)}
                </div>
              </div>
            )) : (<div className="p-8 text-center text-slate-500"><p>Nenhum registro encontrado.</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}