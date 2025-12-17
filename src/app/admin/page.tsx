'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format, differenceInMinutes, isSameDay, getDay, eachDayOfInterval } from 'date-fns';
import { LogOut, Bell, AlertCircle, ShieldAlert, CalendarDays, TrendingUp, TrendingDown, Clock, Calendar, User, FileText, ExternalLink, Edit2, Save, X, Plane, PlusCircle, Search, Settings, ScrollText, LayoutDashboard } from 'lucide-react'; 
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';
import DashboardGraficos from '@/components/DashboardGraficos';
import SeletorLoja from '@/components/SeletorLoja'; // <--- IMPORTADO

const SOM_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export default function AdminDashboard() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState<any>({ nome: 'Carregando...', cnpj: '', configuracoes: { ocultar_menu_atestados: false } });
  const [loading, setLoading] = useState(true);
  
  const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);
  const [pendenciasAjuste, setPendenciasAjuste] = useState(0); 
  const [pendenciasAusencia, setPendenciasAusencia] = useState(0); 
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [pontoEmEdicao, setPontoEmEdicao] = useState<any>(null);
  const [novaHora, setNovaHora] = useState('');
  const [motivoEdicao, setMotivoEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [modalAusenciaAberto, setModalAusenciaAberto] = useState(false);
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
      const [resPontos, resAusencias, resUsers, resSolicitacoes, resPendencias, resFeriados, resEmpresa] = await Promise.all([
        axios.get('/api/admin/pontos-todos'),
        axios.get('/api/admin/ausencias-aprovadas'),
        axios.get('/api/admin/funcionarios'),
        axios.get('/api/admin/solicitacoes'), 
        axios.get('/api/admin/ausencias'),    
        axios.get('/api/admin/feriados'),
        axios.get('/api/admin/empresa')
      ]);

      setUsuarios(resUsers.data);
      setFeriados(resFeriados.data.map((f: any) => format(new Date(f.data), 'yyyy-MM-dd')));
      setEmpresa(resEmpresa.data);
      setPendenciasAjuste(resSolicitacoes.data.length);
      setPendenciasAusencia(resPendencias.data.length);

      const listaUnificada: any[] = [];
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

  const abrirModalEdicao = (ponto: any) => { setPontoEmEdicao(ponto); setNovaHora(format(new Date(ponto.dataHora), 'HH:mm')); setMotivoEdicao(''); setModalEdicaoAberto(true); };
  const salvarEdicaoPonto = async () => { if (!novaHora || !pontoEmEdicao) return; setSalvandoEdicao(true); try { const dataOriginal = format(new Date(pontoEmEdicao.dataHora), 'yyyy-MM-dd'); const dataHoraFinal = new Date(`${dataOriginal}T${novaHora}:00`); await axios.put('/api/admin/ponto/editar', { id: pontoEmEdicao.id, novoHorario: dataHoraFinal.toISOString(), motivo: motivoEdicao }); alert('Horário corrigido!'); setModalEdicaoAberto(false); carregarDados(); } catch (error) { alert('Erro ao editar.'); } finally { setSalvandoEdicao(false); } };
  const abrirModalAusencia = () => { setAusenciaUser(''); setAusenciaTipo('FERIAS'); setAusenciaInicio(''); setAusenciaFim(''); setAusenciaMotivo(''); setModalAusenciaAberto(true); };
  const salvarAusenciaAdmin = async () => { if (!ausenciaUser || !ausenciaInicio) return alert("Preencha funcionário e data de início."); setSalvandoAusencia(true); try { await axios.post('/api/admin/ausencias/criar', { usuarioId: ausenciaUser, tipo: ausenciaTipo, dataInicio: ausenciaInicio, dataFim: ausenciaFim || ausenciaInicio, motivo: ausenciaMotivo }); alert('Lançamento realizado!'); setModalAusenciaAberto(false); carregarDados(); } catch (error) { alert('Erro ao lançar.'); } finally { setSalvandoAusencia(false); } };

  const registrosFiltrados = registros.filter(r => {
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

  const aplicarTolerancia = (dataReal: Date, horarioMetaString: string) => {
      if (!horarioMetaString) return dataReal; 
      const [h, m] = horarioMetaString.split(':').map(Number);
      const dataMeta = new Date(dataReal);
      dataMeta.setHours(h, m, 0, 0);
      const diff = Math.abs(differenceInMinutes(dataReal, dataMeta));
      if (diff <= 10) return dataMeta;
      return dataReal;
  };

  const calcularEstatisticas = () => {
    if (!filtroUsuario) return null;

    const agora = new Date();
    const pontosOrdenados = registros
        .filter(r => r.usuario.id === filtroUsuario && r.tipo === 'PONTO')
        .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    const usuarioInfo = usuarios.find(u => u.id === filtroUsuario);
    const jornadaConfig = usuarioInfo?.jornada || {};

    const fixData = (d: any) => {
        if(!d) return new Date();
        const str = typeof d === 'string' ? d : d.toISOString();
        const [ano, mes, dia] = str.split('T')[0].split('-').map(Number);
        return new Date(ano, mes - 1, dia, 12, 0, 0);
    };

    const diasIsentos = new Set<string>();
    const ausencias = registros.filter(r => r.usuario.id === filtroUsuario && r.tipo === 'AUSENCIA');
    ausencias.forEach(aus => {
        const inicio = fixData(aus.dataHora);
        const fim = aus.extra?.dataFim ? fixData(aus.extra.dataFim) : inicio;
        try {
            eachDayOfInterval({ start: inicio, end: fim }).forEach(dia => {
                diasIsentos.add(format(dia, 'yyyy-MM-dd'));
            });
        } catch(e) {}
    });

    const getMetaDoDia = (data: Date) => {
        const dataString = format(data, 'yyyy-MM-dd');
        if (feriados.includes(dataString) || diasIsentos.has(dataString)) return 0;

        const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const diaSemana = diasMap[getDay(data)];
        const config = jornadaConfig[diaSemana];
        if (!config || !config.ativo) return 0;
        
        const calcDiff = (i:string, f:string) => {
            if(!i || !f) return 0;
            const [h1, m1] = i.split(':').map(Number);
            const [h2, m2] = f.split(':').map(Number);
            let diff = (h2*60 + m2) - (h1*60 + m1);
            if (diff < 0) diff += 1440; 
            return diff;
        };
        return calcDiff(config.e1, config.s1) + calcDiff(config.e2, config.s2);
    };

    let minutosHoje = 0;
    let minutosTotalPeriodo = 0;
    let statusAtual = "Ausente";
    let tempoDecorridoAgora = 0;

    const contagemDia: Record<string, number> = {};

    for (let i = 0; i < pontosOrdenados.length; i++) {
        const pEntrada = pontosOrdenados[i];
        if (['ENTRADA', 'VOLTA_ALMOCO'].includes(pEntrada.subTipo || pEntrada.tipo)) {
            const dataEntradaReal = new Date(pEntrada.dataHora);
            const diaStr = format(dataEntradaReal, 'yyyy-MM-dd');
            
            if (!contagemDia[diaStr]) contagemDia[diaStr] = 0; 
            const parIndex = contagemDia[diaStr]; 
            contagemDia[diaStr]++;

            const diaSemana = ['dom','seg','ter','qua','qui','sex','sab'][getDay(dataEntradaReal)]; 
            const configDia = jornadaConfig[diaSemana] || {};
            
            const metaEntradaStr = parIndex === 0 ? configDia.e1 : configDia.e2;
            const metaSaidaStr = parIndex === 0 ? configDia.s1 : configDia.s2;

            const dataEntradaCalc = aplicarTolerancia(dataEntradaReal, metaEntradaStr);
            const pSaida = pontosOrdenados[i+1];

            if (pSaida && ['SAIDA', 'SAIDA_ALMOCO'].includes(pSaida.subTipo || pSaida.tipo)) {
                const dataSaidaReal = new Date(pSaida.dataHora);
                const dataSaidaCalc = aplicarTolerancia(dataSaidaReal, metaSaidaStr);
                const diff = differenceInMinutes(dataSaidaCalc, dataEntradaCalc);
                if (diff > 0 && diff < 1440) {
                    if (diaStr >= dataInicio && diaStr <= dataFim) minutosTotalPeriodo += diff;
                    if (isSameDay(dataEntradaReal, agora)) minutosHoje += diff;
                }
                i++; 
            } else {
                if (isSameDay(dataEntradaReal, agora)) {
                    const diff = differenceInMinutes(agora, dataEntradaCalc);
                    if (diff > 0 && diff < 1440) {
                        minutosHoje += diff;
                        statusAtual = "Trabalhando";
                        tempoDecorridoAgora = diff;
                        if (diaStr >= dataInicio && diaStr <= dataFim) minutosTotalPeriodo += diff;
                    }
                }
            }
        }
    }

    let minutosEsperadosPeriodo = 0;
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
  const configs = empresa.configuracoes || {}; 

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 relative">
      {notificacaoVisivel && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right duration-500 fade-in">
            <Link href={pendenciasAjuste > 0 ? "/admin/solicitacoes" : "/admin/pendencias"}>
                <div className="bg-purple-600 text-white p-4 rounded-xl shadow-2xl border border-purple-400 flex items-center gap-4 cursor-pointer hover:bg-purple-700 hover:scale-105 transition-all">
                <div className="bg-white p-2 rounded-full animate-bounce text-purple-600"><Bell size={24} fill="currentColor" /></div>
                <div><p className="font-bold text-sm">Novas Pendências!</p><div className="text-xs text-purple-100 flex flex-col">{pendenciasAjuste > 0 && <span>• {pendenciasAjuste} Ajuste(s)</span>}{pendenciasAusencia > 0 && <span>• {pendenciasAusencia} Justificativa(s)</span>}</div></div>
                </div>
            </Link>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-purple-400">{empresa.nome}</h1>
            <p className="text-slate-400 text-sm">Painel Administrativo</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            
            <Link href="/admin/dashboard" className="flex items-center gap-3 p-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><LayoutDashboard size={20} /><span>Visão Geral</span></Link>
            <button onClick={abrirModalAusencia} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm flex items-center gap-2 border border-blue-500 shadow-lg shadow-blue-900/20"><Plane size={16} /> Lançar Férias/Folga</button>
            <Link href="/admin/solicitacoes" className="px-4 py-2 bg-purple-900/50 text-purple-300 border border-purple-800 rounded-lg hover:bg-purple-900 transition text-sm flex items-center gap-2 relative"><AlertCircle size={16} /> Ajustes {pendenciasAjuste > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-950">{pendenciasAjuste}</span>}</Link>
            
            {!configs.ocultar_menu_atestados && (
                <Link href="/admin/pendencias" className="px-4 py-2 bg-yellow-900/50 text-yellow-300 border border-yellow-800 rounded-lg hover:bg-yellow-900 transition text-sm flex items-center gap-2 relative"><ShieldAlert size={16} /> Atestados {pendenciasAusencia > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-slate-950">{pendenciasAusencia}</span>}</Link>
            )}
            
            {/* === AQUI ESTÁ O BOTÃO DE SELECIONAR LOJA (NA BARRA DIREITA) === */}
            <SeletorLoja empresaAtualId={empresa.id} empresaAtualNome={empresa.nome} />
            {/* =============================================================== */}

            <Link href="/admin/configuracoes" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700 flex items-center gap-2"><Settings size={16} /> Configurações</Link>
            <Link href="/admin/logs" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700 flex items-center gap-2"><ScrollText size={16} /> Logs</Link>
            <Link href="/admin/feriados" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700 flex items-center gap-2"><CalendarDays size={16} /> Feriados</Link>
            <Link href="/admin/funcionarios" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700">Equipe</Link>
            <Link href="/admin/perfil" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700">Minha Conta</Link>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-4 py-2 bg-red-900/20 text-red-300 rounded-lg hover:bg-red-900/40 transition text-sm flex items-center gap-2 border border-red-900/30"><LogOut size={16} /> Sair</button>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:flex-1"><label className="text-xs text-slate-500 mb-1 block">Funcionário</label><select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"><option value="">Todos os Funcionários</option>{usuarios.map(u => (<option key={u.id} value={u.id}>{u.nome}</option>))}</select></div>
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto"><div><label className="text-xs text-slate-500 mb-1 block">Data Início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"/></div><div><label className="text-xs text-slate-500 mb-1 block">Data Fim</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"/></div></div>
          <div className="w-full md:w-auto"><BotaoRelatorio pontos={registrosFiltrados} filtro={{ inicio: criarDataLocal(dataInicio), fim: criarDataLocal(dataFim), usuario: filtroUsuario ? usuarios.find(u=>u.id === filtroUsuario)?.nome : 'Todos' }} resumoHoras={stats} assinaturaUrl={filtroUsuario ? (usuarios.find(u => u.id === filtroUsuario) as any)?.assinaturaUrl : null} nomeEmpresa={empresa.nome}/></div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${stats.status === 'Trabalhando' ? 'bg-green-900/20 border-green-800' : 'bg-slate-900 border-slate-800'}`}><h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status Agora</h3><p className={`text-lg font-bold ${stats.status === 'Trabalhando' ? 'text-green-400' : 'text-slate-500'}`}>{stats.status}</p>{stats.status === 'Trabalhando' && <p className="text-xs text-green-300 mt-1">⏱ {stats.tempoAgora}</p>}</div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hoje</h3><div className="flex items-baseline gap-2"><p className="text-lg font-bold text-white">{stats.hoje}</p><p className="text-[10px] text-slate-500">/ Meta: {stats.metaHoje}</p></div></div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Trabalhado (Período)</h3><p className="text-lg font-bold text-white">{stats.total}</p></div>
            {!configs.ocultarSaldoHoras ? (<div className={`p-4 rounded-xl border ${stats.saldoPositivo ? 'bg-green-900/10 border-green-900' : 'bg-red-900/10 border-red-900'}`}><h3 className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">{stats.saldoPositivo ? <TrendingUp size={14} className="text-green-500"/> : <TrendingDown size={14} className="text-red-500"/>}<span className={stats.saldoPositivo ? 'text-green-500' : 'text-red-500'}>Banco de Horas</span></h3><p className={`text-2xl font-bold ${stats.saldoPositivo ? 'text-green-400' : 'text-red-400'}`}>{stats.saldo}</p><p className="text-[10px] text-slate-500 mt-1">Saldo do período</p></div>) : (<div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-center opacity-50"><p className="text-xs text-slate-500">Saldo Oculto (Config)</p></div>)}
          </div>
        )}

        <div className="mt-6"><DashboardGraficos registros={registrosFiltrados} /></div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl mt-6">
          <div className="hidden md:grid grid-cols-5 bg-slate-950 p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800"><div>Funcionário</div><div>Data</div><div>Hora / Tipo</div><div className="col-span-1">Local / Motivo</div><div className="text-right">Comprovante</div></div>
          <div className="divide-y divide-slate-800">
            {registrosFiltrados.length > 0 ? registrosFiltrados.map((reg) => (
              <div key={reg.id} className={`p-4 flex flex-col md:grid md:grid-cols-5 md:items-center gap-3 transition-colors ${reg.tipo === 'AUSENCIA' ? 'bg-yellow-900/10 hover:bg-yellow-900/20' : 'hover:bg-slate-800/30'}`}>
                <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${reg.tipo === 'AUSENCIA' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-purple-900/50 text-purple-200'}`}>{reg.tipo === 'AUSENCIA' ? <FileText size={16}/> : <User size={16} />}</div><div><p className="font-bold text-white text-sm md:text-base">{reg.usuario.nome}</p><div className="flex flex-col md:flex-row gap-1"><p className="text-xs text-slate-500">{reg.usuario.email}</p>{reg.usuario.tituloCargo && <span className="text-[10px] bg-slate-800 px-1.5 rounded text-purple-400 border border-slate-700 md:hidden w-fit">{reg.usuario.tituloCargo}</span>}</div></div></div>
                <div className="flex items-center gap-2 md:block text-slate-300"><Calendar size={14} className="md:hidden text-slate-500" /><span className="text-sm font-bold">{format(new Date(reg.dataHora), 'dd/MM/yyyy')}</span>{reg.tipo === 'AUSENCIA' && reg.extra?.dataFim && reg.extra.dataFim !== reg.dataHora && (<span className="text-[10px] text-slate-500 block">até {format(new Date(reg.extra.dataFim), 'dd/MM')}</span>)}</div>
                
                <div className="flex items-center gap-2 md:block group">
                  {reg.tipo === 'PONTO' ? (<><div className="flex items-center gap-2"><Clock size={14} className="md:hidden text-green-500" /><span className="text-sm font-bold text-green-400">{format(new Date(reg.dataHora), 'HH:mm')}</span><button onClick={() => abrirModalEdicao(reg)} className="opacity-100 md:opacity-0 group-hover:opacity-100 bg-slate-700 p-1.5 rounded text-slate-300 hover:text-white hover:bg-purple-600 transition-all ml-2" title="Editar Horário"><Edit2 size={12} /></button></div><span className="text-[10px] text-slate-500 block uppercase">{reg.subTipo?.replace('_', ' ')}</span></>) : (<span className="text-xs font-bold bg-yellow-600 text-white px-2 py-1 rounded uppercase">{reg.subTipo?.replace('_', ' ')}</span>)}
                </div>

                <div className="flex items-start gap-2 md:block col-span-1"><span className="text-xs text-slate-400 block break-words" title={reg.descricao}>{reg.descricao ? (reg.descricao.length > 40 ? reg.descricao.substring(0, 40) + '...' : reg.descricao) : (reg.tipo === 'PONTO' ? `${reg.extra?.fotoUrl ? 'GPS + Foto' : 'GPS'}` : '-')}</span></div>
                <div className="md:text-right mt-2 md:mt-0">{reg.tipo === 'PONTO' && reg.extra?.fotoUrl && (<a href={reg.extra.fotoUrl} target="_blank" className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600/10 text-purple-400 border border-purple-600/30 rounded text-xs font-bold hover:bg-purple-600 hover:text-white transition-all"><ExternalLink size={12} /> Ver Foto</a>)}{reg.tipo === 'AUSENCIA' && reg.extra?.comprovanteUrl && (<a href={reg.extra.comprovanteUrl} target="_blank" className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-yellow-600/10 text-yellow-400 border border-yellow-600/30 rounded text-xs font-bold hover:bg-yellow-600 hover:text-white transition-all"><FileText size={12} /> Ver Atestado</a>)}</div>
              </div>
            )) : (<div className="p-8 text-center text-slate-500"><p>Nenhum registro encontrado.</p></div>)}
          </div>
        </div>

        {modalEdicaoAberto && (<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4"><div className="flex justify-between items-center border-b border-slate-800 pb-3"><h3 className="text-lg font-bold text-white flex items-center gap-2"><Edit2 size={20} className="text-purple-400"/> Editar Horário</h3><button onClick={() => setModalEdicaoAberto(false)} className="text-slate-500 hover:text-white"><X size={20}/></button></div><div><p className="text-xs text-slate-400 mb-1">Funcionário</p><p className="font-bold text-white">{pontoEmEdicao?.usuario?.nome}</p></div><div><label className="text-xs text-slate-500 block mb-1">Novo Horário</label><input type="time" value={novaHora} onChange={e=>setNovaHora(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-lg font-bold text-center focus:border-purple-500 outline-none" /></div><div><label className="text-xs text-slate-500 block mb-1">Motivo</label><input type="text" value={motivoEdicao} onChange={e=>setMotivoEdicao(e.target.value)} placeholder="Correção..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm outline-none focus:border-purple-500"/></div><button onClick={salvarEdicaoPonto} disabled={salvandoEdicao || !motivoEdicao} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 mt-2">{salvandoEdicao ? 'Salvando...' : <><Save size={18}/> Salvar</>}</button></div></div>)}
        {modalAusenciaAberto && (<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4"><div className="flex justify-between items-center border-b border-slate-800 pb-3"><h3 className="text-lg font-bold text-white flex items-center gap-2"><Plane size={20} className="text-blue-400"/> Lançar Ausência</h3><button onClick={() => setModalAusenciaAberto(false)} className="text-slate-500 hover:text-white"><X size={20}/></button></div><div><label className="text-xs text-slate-500 block mb-1">Funcionário</label><select value={ausenciaUser} onChange={e=>setAusenciaUser(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm"><option value="">Selecione...</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-slate-500 block mb-1">Tipo</label><select value={ausenciaTipo} onChange={e=>setAusenciaTipo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded text-white text-xs"><option value="FERIAS">Férias</option><option value="FOLGA">Folga / Abono</option><option value="FALTA_JUSTIFICADA">Atestado Médico</option><option value="SUSPENSAO">Suspensão</option></select></div><div><label className="text-xs text-slate-500 block mb-1">Início</label><input type="date" value={ausenciaInicio} onChange={e=>setAusenciaInicio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded text-white text-xs text-center"/></div></div><div><label className="text-xs text-slate-500 block mb-1">Fim (Opcional)</label><input type="date" value={ausenciaFim} onChange={e=>setAusenciaFim(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded text-white text-sm text-center"/></div><div><label className="text-xs text-slate-500 block mb-1">Observação</label><textarea value={ausenciaMotivo} onChange={e=>setAusenciaMotivo(e.target.value)} placeholder="Ex: Férias coletivas..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm h-20 resize-none"/></div><button onClick={salvarAusenciaAdmin} disabled={salvandoAusencia} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 mt-2">{salvandoAusencia ? 'Lançando...' : <><PlusCircle size={18}/> Confirmar Lançamento</>}</button></div></div>)}

      </div>
    </div>
  );
}