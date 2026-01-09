'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link'; // Importado Link
import { Users, Clock, Coffee, AlertCircle, RefreshCw, ArrowLeft, Search } from 'lucide-react'; // Importado ArrowLeft

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

export default function DashboardPresenca() {
  const [lista, setLista] = useState<FuncionarioStatus[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ total: 0, trabalhando: 0, pausa: 0, offline: 0 });
  const [loading, setLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(new Date());
  const [buscaNome, setBuscaNome] = useState('');


  const carregarDados = async () => {
    setLoading(true); // Opcional: mostrar loading no botão ao recarregar manual
    try {
      const res = await axios.get('/api/admin/dashboard/agora');
      setLista(res.data.lista);
      setResumo(res.data.resumo);
      setUltimaAtualizacao(new Date());
    } catch (error) {
      console.error("Erro ao atualizar dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Atualiza automaticamente a cada 30 segundos
  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(carregarDados, 30000); 
    return () => clearInterval(intervalo);
  }, []);

  // Formata hora (ex: 14:30)
  const formatarHora = (dataIso?: string) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const listaFiltrada = lista.filter((func) => {
  if (!buscaNome.trim()) return true;
  return (func.nome || '').toLowerCase().includes(buscaNome.trim().toLowerCase());
});





  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* CABEÇALHO COM BOTÃO VOLTAR */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors shadow-lg shadow-slate-900/20" title="Voltar ao Menu">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-white mb-1">Painel em Tempo Real</h1>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Atualizado às {ultimaAtualizacao.toLocaleTimeString()}
                </p>
            </div>
          </div>

          <button onClick={carregarDados} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors font-semibold" title="Atualizar Agora">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CardResumo icone={<Users size={24}/>} titulo="Total Equipe" valor={resumo.total} cor="bg-slate-800" texto="text-white" />
          <CardResumo icone={<Clock size={24}/>} titulo="Trabalhando" valor={resumo.trabalhando} cor="bg-green-900/40 border-green-900" texto="text-green-400" />
          <CardResumo icone={<Coffee size={24}/>} titulo="Pausa / Saiu" valor={resumo.pausa} cor="bg-yellow-900/40 border-yellow-900" texto="text-yellow-500" />
          <CardResumo icone={<AlertCircle size={24}/>} titulo="Ausentes/Offline" valor={resumo.offline} cor="bg-slate-800/50" texto="text-slate-500" />
        </div>

        {/* LISTA DETALHADA */}
        <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
  <h3 className="font-bold text-slate-300">Status dos Funcionários</h3>

  <div className="relative w-full md:w-[320px]">
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
    <input
      value={buscaNome}
      onChange={(e) => setBuscaNome(e.target.value)}
      placeholder="Buscar funcionário..."
      className="w-full bg-slate-950/40 border border-slate-700 hover:border-slate-600 focus:border-purple-500/60 outline-none rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-200 placeholder:text-slate-600 transition-colors"
    />
    {buscaNome.trim() && (
      <button
        onClick={() => setBuscaNome('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
        title="Limpar"
      >
        ×
      </button>
    )}
  </div>
</div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">  
        


            
            <div className="divide-y divide-slate-800">
                {listaFiltrada.length === 0 && !loading && (
  <div className="p-8 text-center text-slate-500">
    {buscaNome.trim()
      ? `Nenhum funcionário encontrado para "${buscaNome}".`
      : 'Nenhum funcionário encontrado.'}
  </div>
)}

{listaFiltrada.map((func) => (

                    <div key={func.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-4">
                            {/* FOTO E STATUS VISUAL */}
                            <div className="relative">
                                {func.foto ? (
                                    <img src={func.foto} className="w-12 h-12 rounded-full object-cover border border-slate-700" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                        <Users size={20} className="text-slate-500"/>
                                    </div>
                                )}
                                {/* BOLINHA DE STATUS */}
                                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 
                                    ${func.status === 'TRABALHANDO' ? 'bg-green-500' : 
                                      func.status === 'PAUSA_OU_SAIU' ? 'bg-yellow-500' : 'bg-slate-500'}`}>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-white">{func.nome}</h4>
                                <p className="text-xs text-slate-400 uppercase">{func.cargo}</p>
                            </div>
                        </div>

                        {/* INFO DE TEXTO */}
                        <div className="text-right">
                             {func.status === 'TRABALHANDO' && (
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded mb-1">EM SERVIÇO</span>
                                    <span className="text-xs text-slate-400">Entrou às {formatarHora(func.horarioUltimaAcao)}</span>
                                </div>
                             )}
                             {func.status === 'PAUSA_OU_SAIU' && (
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded mb-1">PAUSA / SAIU</span>
                                    <span className="text-xs text-slate-400">Último registro: {formatarHora(func.horarioUltimaAcao)}</span>
                                </div>
                             )}
                             {func.status === 'OFFLINE' && (
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold bg-slate-700/50 text-slate-500 px-2 py-1 rounded mb-1">OFFLINE</span>
                                    <span className="text-xs text-slate-600">Sem registros hoje</span>
                                </div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}

// Componente simples para os cards do topo
function CardResumo({ icone, titulo, valor, cor, texto }: any) {
    return (
        <div className={`p-4 rounded-xl border border-transparent ${cor}`}>
            <div className="flex justify-between items-start mb-2">
                <div className={`${texto}`}>{icone}</div>
                <span className={`text-3xl font-bold ${texto}`}>{valor}</span>
            </div>
            <p className="text-slate-400 text-xs font-medium uppercase">{titulo}</p>
        </div>
    );
}