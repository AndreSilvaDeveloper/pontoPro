'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, differenceInMinutes, startOfWeek, startOfMonth, startOfYear, isSameDay, isAfter, getDay } from 'date-fns';
import { LogOut, ArrowLeft } from 'lucide-react'; // Importe LogOut aqui
import { signOut } from 'next-auth/react'; // Importe signOut aqui
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';

// Funções de data
const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

interface Ponto {
  id: string;
  dataHora: string;
  latitude: number;
  longitude: number;
  endereco?: string;
  fotoUrl?: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    jornada?: any; // JSON
  };
}

interface UsuarioResumo {
  id: string;
  nome: string;
}

export default function AdminDashboard() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const resPontos = await axios.get('/api/admin/pontos-todos');
      setPontos(resPontos.data);
      const resUsers = await axios.get('/api/admin/funcionarios');
      setUsuarios(resUsers.data);
    } catch (error) {
      console.error("Erro ao carregar", error);
    }
  };

  const pontosFiltrados = pontos.filter(p => {
    const dataPontoTexto = format(new Date(p.dataHora), 'yyyy-MM-dd');
    const passaData = dataPontoTexto >= dataInicio && dataPontoTexto <= dataFim;
    const passaUsuario = filtroUsuario ? p.usuario.id === filtroUsuario : true;
    return passaData && passaUsuario;
  });

  const calcularEstatisticas = () => {
    if (!filtroUsuario) return null;

    const agora = new Date();
    const pontosDoUsuario = pontos.filter(p => p.usuario.id === filtroUsuario);
    // Pega os dados do usuário completo (incluindo a jornada JSON)
    const dadosUsuario = pontosDoUsuario[0]?.usuario || usuarios.find(u => u.id === filtroUsuario); // Fallback se não tiver pontos ainda
    // @ts-ignore
    const jornadaConfig = dadosUsuario?.jornada || {};

    pontosDoUsuario.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    let minutosHoje = 0;
    let minutosSemana = 0;
    let minutosMes = 0;
    let minutosAno = 0;
    let statusAtual = "Ausente";
    let tempoDecorridoAgora = 0;
    
    // Calcula a META do dia de hoje baseado no dia da semana (0=Dom, 1=Seg...)
    const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const diaSemanaHoje = diasMap[getDay(agora)];
    const configHoje = jornadaConfig[diaSemanaHoje];
    
    let metaHojeMinutos = 0;
    if (configHoje && configHoje.ativo) {
        // Calcula horas esperadas: (s1 - e1) + (s2 - e2)
        const calcDiff = (inicio: string, fim: string) => {
            if (!inicio || !fim) return 0;
            const [h1, m1] = inicio.split(':').map(Number);
            const [h2, m2] = fim.split(':').map(Number);
            return (h2 * 60 + m2) - (h1 * 60 + m1);
        };
        metaHojeMinutos += calcDiff(configHoje.e1, configHoje.s1);
        metaHojeMinutos += calcDiff(configHoje.e2, configHoje.s2);
    }

    // ... (Lógica de somar pontos trabalhados continua a mesma) ...
    // Vou resumir para caber: Use a mesma lógica de loop do passo anterior para somar minutosHoje, Semana, etc.
    
    const pontosPorDia: Record<string, typeof pontosDoUsuario> = {};
    pontosDoUsuario.forEach(p => {
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
      const dataObj = criarDataLocal(dia);
      if (isSameDay(dataObj, agora)) minutosHoje += minutosNoDia;
      if (isAfter(dataObj, startOfWeek(agora))) minutosSemana += minutosNoDia;
      if (isAfter(dataObj, startOfMonth(agora))) minutosMes += minutosNoDia;
      if (isAfter(dataObj, startOfYear(agora))) minutosAno += minutosNoDia;
    });

    const formatarHoras = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
    const formatarMeta = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

    return {
      status: statusAtual,
      tempoAgora: statusAtual === "Trabalhando" ? formatarHoras(tempoDecorridoAgora) : "--",
      hoje: formatarHoras(minutosHoje),
      metaHoje: formatarMeta(metaHojeMinutos), // Nova info
      semana: formatarHoras(minutosSemana),
      mes: formatarHoras(minutosMes),
      ano: formatarHoras(minutosAno)
    };
  };

  const stats = calcularEstatisticas();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Painel de Controle</h1>
            <p className="text-slate-400">Visão Geral da Empresa</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/funcionarios" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm">Equipe</Link>
            <Link href="/admin/perfil" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm">Minha Conta</Link>
            
            {/* LOGOUT CORRIGIDO AQUI 👇 */}
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900 transition text-sm flex items-center gap-2"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-500 mb-1 block">Funcionário</label>
            <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white">
              <option value="">Todos os Funcionários</option>
              {usuarios.map(u => (<option key={u.id} value={u.id}>{u.nome}</option>))}
            </select>
          </div>
          <div className="w-full md:w-auto">
            <label className="text-xs text-slate-500 mb-1 block">Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-950 border border-slate-700 p-2 rounded text-white"/>
          </div>
          <div className="w-full md:w-auto">
            <label className="text-xs text-slate-500 mb-1 block">Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-950 border border-slate-700 p-2 rounded text-white"/>
          </div>
          <BotaoRelatorio 
            pontos={pontosFiltrados} 
            filtro={{ inicio: criarDataLocal(dataInicio), fim: criarDataLocal(dataFim), usuario: filtroUsuario ? usuarios.find(u=>u.id === filtroUsuario)?.nome : 'Todos' }} 
            resumoHoras={stats}
          />
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded-xl border ${stats.status === 'Trabalhando' ? 'bg-green-900/30 border-green-800' : 'bg-slate-900 border-slate-800'}`}>
              <h3 className="text-xs text-slate-400 uppercase font-bold">Status</h3>
              <p className={`text-xl font-bold ${stats.status === 'Trabalhando' ? 'text-green-400' : 'text-slate-500'}`}>{stats.status}</p>
              {stats.status === 'Trabalhando' && <p className="text-xs text-green-300">Há {stats.tempoAgora}</p>}
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><h3 className="text-xs text-slate-400 uppercase font-bold">Hoje</h3><p className="text-xl font-bold text-white">{stats.hoje}</p></div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><h3 className="text-xs text-slate-400 uppercase font-bold">Semana</h3><p className="text-xl font-bold text-white">{stats.semana}</p></div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><h3 className="text-xs text-slate-400 uppercase font-bold">Mês</h3><p className="text-xl font-bold text-white">{stats.mes}</p></div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><h3 className="text-xs text-slate-400 uppercase font-bold">Ano</h3><p className="text-xl font-bold text-white">{stats.ano}</p></div>
          </div>
        )}

        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-800">
                  <th className="p-4">Funcionário</th><th className="p-4">Data</th><th className="p-4">Hora</th><th className="p-4">Local</th><th className="p-4">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pontosFiltrados.length > 0 ? pontosFiltrados.map((ponto) => (
                  <tr key={ponto.id} className="hover:bg-slate-800/50">
                    <td className="p-4 font-medium">{ponto.usuario.nome}</td>
                    <td className="p-4 text-slate-300">{format(new Date(ponto.dataHora), 'dd/MM/yyyy')}</td>
                    <td className="p-4 font-bold text-green-400">{format(new Date(ponto.dataHora), 'HH:mm')}</td>
                    <td className="p-4 text-xs text-slate-400 max-w-[200px] truncate" title={ponto.endereco}>{ponto.endereco || `${ponto.latitude.toFixed(4)}, ${ponto.longitude.toFixed(4)}`}</td>
                    <td className="p-4">{ponto.fotoUrl && <a href={ponto.fotoUrl} target="_blank" className="text-blue-400 text-xs hover:underline">Ver</a>}</td>
                  </tr>
                )) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum registro.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}