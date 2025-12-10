'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, differenceInMinutes, startOfWeek, startOfMonth, startOfYear, isSameDay, isAfter, getDay } from 'date-fns';
import { LogOut, MapPin, User, Calendar, Clock, ExternalLink, AlertCircle, LayoutDashboard, Bell, ShieldAlert, FileText, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react'; 
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';

const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

// ... Interfaces (RegistroUnificado, UsuarioResumo...) MANTENHA IGUAL ...
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
  // ... States (registros, usuarios, loading...) MANTENHA IGUAL ...
  const [registros, setRegistros] = useState<RegistroUnificado[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]); // NOVA STATE PARA FERIADOS (Array de strings YYYY-MM-DD)
  const [loading, setLoading] = useState(true);
  
  const [notificacao, setNotificacao] = useState<{qtd: number, visivel: boolean}>({ qtd: 0, visivel: false });
  const [pendenciasAjuste, setPendenciasAjuste] = useState(0);
  const [pendenciasAusencia, setPendenciasAusencia] = useState(0);

  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    try {
      // Adicionamos a chamada de FERIADOS
      const [resPontos, resAusencias, resUsers, resSolicitacoes, resPendencias, resFeriados] = await Promise.all([
        axios.get('/api/admin/pontos-todos'),
        axios.get('/api/admin/ausencias-aprovadas'),
        axios.get('/api/admin/funcionarios'),
        axios.get('/api/admin/solicitacoes'),
        axios.get('/api/admin/ausencias'),
        axios.get('/api/admin/feriados') // <--- NOVA CHAMADA
      ]);

      setUsuarios(resUsers.data);
      
      // Processa Feriados para formato simples ['2025-12-25', '2026-01-01']
      const listaFeriados = resFeriados.data.map((f: any) => format(new Date(f.data), 'yyyy-MM-dd'));
      setFeriados(listaFeriados);

      // ... (Lógica de notificações e lista unificada MANTIDA IGUAL ao passo anterior) ...
      setPendenciasAjuste(resSolicitacoes.data.length);
      setPendenciasAusencia(resPendencias.data.length);
      const totalPendencias = resSolicitacoes.data.length + resPendencias.data.length;
      if (totalPendencias > 0) {
        setNotificacao({ qtd: totalPendencias, visivel: true });
        setTimeout(() => setNotificacao(p => ({ ...p, visivel: false })), 5000);
      }

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

    } catch (error) { console.error("Erro", error); } finally { setLoading(false); }
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
        // === CHECAGEM DE FERIADO ===
        const dataString = format(data, 'yyyy-MM-dd');
        if (feriados.includes(dataString)) return 0; // Se for feriado, meta é 0
        // ===========================

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

    // 1. TRABALHADO
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

    // 2. ESPERADO
    let loopData = criarDataLocal(dataInicio);
    const fimData = criarDataLocal(dataFim);
    
    while (loopData <= fimData) {
        if (loopData <= agora) {
            minutosEsperadosPeriodo += getMetaDoDia(loopData);
        }
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
      {/* ... Toast ... (igual) */}
      
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-purple-400">WorkID Admin</h1>
            <p className="text-slate-400 text-sm">Visão Geral da Empresa</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/admin/solicitacoes" className="px-4 py-2 bg-purple-900/50 text-purple-300 border border-purple-800 rounded-lg hover:bg-purple-900 transition text-sm flex items-center gap-2 relative">
              <AlertCircle size={16} /> Ajustes
              {pendenciasAjuste > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">{pendenciasAjuste}</span>}
            </Link>
            <Link href="/admin/pendencias" className="px-4 py-2 bg-yellow-900/50 text-yellow-300 border border-yellow-800 rounded-lg hover:bg-yellow-900 transition text-sm flex items-center gap-2 relative">
              <ShieldAlert size={16} /> Atestados
              {pendenciasAusencia > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">{pendenciasAusencia}</span>}
            </Link>
            
            {/* NOVO BOTÃO FERIADOS */}
            <Link href="/admin/feriados" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700 flex items-center gap-2">
                <CalendarDays size={16} /> Feriados
            </Link>

            <Link href="/admin/funcionarios" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700">Equipe</Link>
            <Link href="/admin/perfil" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700">Minha Conta</Link>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-4 py-2 bg-red-900/20 text-red-300 rounded-lg hover:bg-red-900/40 transition text-sm flex items-center gap-2 border border-red-900/30"><LogOut size={16} /> Sair</button>
          </div>
        </div>

        {/* ... (Resto do HTML: Filtros, Cards, Tabela - MANTENHA IGUAL) ... */}
        {/* Como não mudou, vou economizar espaço aqui. Copie do passo anterior a parte de baixo (do return para baixo) */}
        
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
            <div>
                <label className="text-xs text-slate-500 mb-1 block">Data Início</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"/>
            </div>
            <div>
                <label className="text-xs text-slate-500 mb-1 block">Data Fim</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"/>
            </div>
          </div>
          <div className="w-full md:w-auto">
             <BotaoRelatorio 
                pontos={registrosFiltrados} 
                filtro={{ inicio: criarDataLocal(dataInicio), fim: criarDataLocal(dataFim), usuario: filtroUsuario ? usuarios.find(u=>u.id === filtroUsuario)?.nome : 'Todos' }} 
                resumoHoras={stats} 
             />
          </div>
        </div>

        {/* Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${stats.status === 'Trabalhando' ? 'bg-green-900/20 border-green-800' : 'bg-slate-900 border-slate-800'}`}>
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status Agora</h3>
              <p className={`text-lg font-bold ${stats.status === 'Trabalhando' ? 'text-green-400' : 'text-slate-500'}`}>{stats.status}</p>
              {stats.status === 'Trabalhando' && <p className="text-xs text-green-300 mt-1">⏱ {stats.tempoAgora}</p>}
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hoje</h3>
                <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold text-white">{stats.hoje}</p>
                    <p className="text-[10px] text-slate-500">/ Meta: {stats.metaHoje}</p>
                </div>
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

        {/* LISTA RESPONSIVA UNIFICADA */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="hidden md:grid grid-cols-5 bg-slate-950 p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <div>Funcionário</div>
            <div>Data</div>
            <div>Hora / Tipo</div>
            <div className="col-span-1">Local / Motivo</div>
            <div className="text-right">Comprovante</div>
          </div>

          <div className="divide-y divide-slate-800">
            {registrosFiltrados.length > 0 ? registrosFiltrados.map((reg) => (
              <div key={reg.id} className={`p-4 flex flex-col md:grid md:grid-cols-5 md:items-center gap-3 transition-colors ${reg.tipo === 'AUSENCIA' ? 'bg-yellow-900/10 hover:bg-yellow-900/20' : 'hover:bg-slate-800/30'}`}>
                
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${reg.tipo === 'AUSENCIA' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-purple-900/50 text-purple-200'}`}>
                    {reg.tipo === 'AUSENCIA' ? <FileText size={16}/> : <User size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm md:text-base">{reg.usuario.nome}</p>
                    <div className="flex flex-col md:flex-row gap-1">
                        <p className="text-xs text-slate-500">{reg.usuario.email}</p>
                        {reg.usuario.tituloCargo && <span className="text-[10px] bg-slate-800 px-1.5 rounded text-purple-400 border border-slate-700 md:hidden w-fit">{reg.usuario.tituloCargo}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:block text-slate-300">
                  <Calendar size={14} className="md:hidden text-slate-500" />
                  <span className="text-sm font-bold">{format(new Date(reg.dataHora), 'dd/MM/yyyy')}</span>
                  {reg.tipo === 'AUSENCIA' && reg.extra?.dataFim && reg.extra.dataFim !== reg.dataHora && (
                      <span className="text-[10px] text-slate-500 block">até {format(new Date(reg.extra.dataFim), 'dd/MM')}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 md:block">
                  {reg.tipo === 'PONTO' ? (
                      <>
                        <Clock size={14} className="md:hidden text-green-500" />
                        <span className="text-sm font-bold text-green-400">{format(new Date(reg.dataHora), 'HH:mm')}</span>
                        <span className="text-[10px] text-slate-500 block uppercase">{reg.subTipo?.replace('_', ' ')}</span>
                      </>
                  ) : (
                      <span className="text-xs font-bold bg-yellow-600 text-white px-2 py-1 rounded uppercase">{reg.subTipo?.replace('_', ' ')}</span>
                  )}
                </div>

                <div className="flex items-start gap-2 md:block col-span-1">
                  <span className="text-xs text-slate-400 block break-words" title={reg.descricao}>
                    {reg.descricao 
                      ? (reg.descricao.length > 40 ? reg.descricao.substring(0, 40) + '...' : reg.descricao) 
                      : (reg.tipo === 'PONTO' ? `${reg.extra?.fotoUrl ? 'GPS + Foto' : 'GPS'}` : '-')
                    }
                  </span>
                </div>

                <div className="md:text-right mt-2 md:mt-0">
                  {reg.tipo === 'PONTO' && reg.extra?.fotoUrl && (
                    <a href={reg.extra.fotoUrl} target="_blank" className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600/10 text-purple-400 border border-purple-600/30 rounded text-xs font-bold hover:bg-purple-600 hover:text-white transition-all"><ExternalLink size={12} /> Ver Foto</a>
                  )}
                  {reg.tipo === 'AUSENCIA' && reg.extra?.comprovanteUrl && (
                    <a href={reg.extra.comprovanteUrl} target="_blank" className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-yellow-600/10 text-yellow-400 border border-yellow-600/30 rounded text-xs font-bold hover:bg-yellow-600 hover:text-white transition-all"><FileText size={12} /> Ver Atestado</a>
                  )}
                </div>

              </div>
            )) : (
              <div className="p-8 text-center text-slate-500"><p>Nenhum registro encontrado.</p></div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}