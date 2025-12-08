'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowLeft, History, Calendar, Search, Clock, Edit3 } from 'lucide-react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';

export default function MeuHistorico() {
  const [pontos, setPontos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<{ total: string; minutos: number } | null>(null);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<any>(null);
  const [novoHorario, setNovoHorario] = useState('');
  const [motivo, setMotivo] = useState('');

  // === CÁLCULO MATEMÁTICO PURO (INFALÍVEL) ===
  const calcularHoras = (listaPontos: any[]) => {
    if (!listaPontos || listaPontos.length === 0) return { total: '0h 0m', minutos: 0 };

    // 1. Cria uma cópia e força ordenação cronológica (Antigo -> Novo)
    const sorted = [...listaPontos].sort((a, b) => {
      return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
    });
    
    let minutosTotal = 0;
    
    // 2. Agrupa por dia (YYYY-MM-DD)
    const pontosPorDia: Record<string, any[]> = {};
    sorted.forEach(p => {
      // Usa slice(0,10) na string ISO para garantir a data universal
      const dataIso = new Date(p.dataHora).toISOString().split('T')[0];
      if (!pontosPorDia[dataIso]) pontosPorDia[dataIso] = [];
      pontosPorDia[dataIso].push(p);
    });

    // 3. Calcula pares
    Object.keys(pontosPorDia).forEach(dia => {
      const batidas = pontosPorDia[dia];
      
      // Pega de 2 em 2 (Entrada com Saída)
      for (let i = 0; i < batidas.length; i += 2) {
        const entrada = new Date(batidas[i].dataHora);
        
        // Se tiver o par (saída), calcula. Se não, ignora.
        if (batidas[i+1]) {
          const saida = new Date(batidas[i+1].dataHora);
          // Diferença em milissegundos / 1000 / 60 = Minutos
          const diffMs = saida.getTime() - entrada.getTime();
          const diffMins = Math.floor(diffMs / 1000 / 60);
          
          if (diffMins > 0) minutosTotal += diffMins;
        }
      }
    });

    const horas = Math.floor(minutosTotal / 60);
    const min = minutosTotal % 60;
    
    return {
      total: `${horas}h ${min}m`,
      minutos: minutosTotal
    };
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/funcionario/historico?inicio=${dataInicio}&fim=${dataFim}`);
      setPontos(res.data);
      // Calcula imediatamente com os dados que chegaram
      setResumo(calcularHoras(res.data));
    } catch (error) {
      console.error("Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Funções do Modal (Mantidas iguais)
  const pedirAjuste = (ponto: any) => {
    setPontoSelecionado(ponto);
    setNovoHorario(format(new Date(ponto.dataHora), 'HH:mm')); 
    setMotivo('');
    setModalAberto(true);
  };

  const enviarSolicitacao = async () => {
    if (!motivo) return alert('Digite o motivo!');
    const dataOriginal = format(new Date(pontoSelecionado.dataHora), 'yyyy-MM-dd');
    const dataHoraFinal = new Date(`${dataOriginal}T${novoHorario}:00`);
    try {
      await axios.post('/api/funcionario/solicitar-ajuste', {
        pontoId: pontoSelecionado.id,
        novoHorario: dataHoraFinal.toISOString(),
        motivo
      });
      alert('Solicitação enviada!');
      setModalAberto(false);
    } catch (error) { alert('Erro ao enviar.'); }
  };

  const filtroPDF = {
    inicio: dataInicio, 
    fim: dataFim,
    usuario: pontos[0]?.usuario.nome || 'Eu'
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <History className="text-purple-400" />
            <h1 className="text-xl font-bold">Meus Registros</h1>
          </div>
          <Link href="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><ArrowLeft size={20} /></Link>
        </div>

        {/* Card Resumo */}
        {resumo && (
          <div className="bg-purple-900/20 border border-purple-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2.5 rounded-lg text-white"><Clock size={24} /></div>
              <div>
                <p className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">Total no Período</p>
                <p className="text-2xl font-bold text-white">{resumo.total}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex gap-2">
            <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm" />
            <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={carregar} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"><Search size={16} /> Filtrar</button>
            
            {/* BOTÃO PDF - PASSANDO O RESUMO CORRETAMENTE */}
            {pontos.length > 0 && (
                <div className="flex-1">
                    <BotaoRelatorio pontos={pontos} filtro={filtroPDF} resumoHoras={resumo} />
                </div>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {pontos.map((ponto) => (
            <div key={ponto.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${ponto.tipo === 'ENTRADA' ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="pl-3">
                <p className="font-bold text-lg text-white">{format(new Date(ponto.dataHora), 'HH:mm')}</p>
                <div className="flex items-center gap-1 text-xs text-slate-400"><Calendar size={10} />{format(new Date(ponto.dataHora), 'dd/MM/yyyy')}</div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1 block">{ponto.tipo}</span>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => pedirAjuste(ponto)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"><Edit3 size={16} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Solicitar Ajuste</h3>
              <input type="time" value={novoHorario} onChange={e=>setNovoHorario(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-lg font-bold text-center" />
              <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Motivo..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm h-24" />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setModalAberto(false)} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-lg font-bold text-sm">Cancelar</button>
                <button onClick={enviarSolicitacao} className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold text-sm">Enviar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}