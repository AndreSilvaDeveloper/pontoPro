'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, differenceInMinutes, isSameDay } from 'date-fns';
import { ArrowLeft, History, Calendar, Search, Clock, Edit3, X, Check } from 'lucide-react'; // Ícones novos
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';

export default function MeuHistorico() {
  const [pontos, setPontos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<any>(null);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Modal de Ajuste
  const [modalAberto, setModalAberto] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<any>(null);
  const [novoHorario, setNovoHorario] = useState('');
  const [motivo, setMotivo] = useState('');

  // ... (Função calcularHoras MANTIDA IGUAL) ...
  const calcularHoras = (listaPontos: any[]) => {
    // ... (copie a lógica anterior ou deixe como estava) ...
    // Vou resumir para não ficar gigante, use a mesma lógica de antes
    const sorted = [...listaPontos].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    let minutosTotal = 0;
    const pontosPorDia: Record<string, any[]> = {};
    sorted.forEach(p => {
      const dia = format(new Date(p.dataHora), 'yyyy-MM-dd');
      if (!pontosPorDia[dia]) pontosPorDia[dia] = [];
      pontosPorDia[dia].push(p);
    });
    Object.keys(pontosPorDia).forEach(dia => {
      const batidas = pontosPorDia[dia];
      for (let i = 0; i < batidas.length; i += 2) {
        const entrada = new Date(batidas[i].dataHora);
        const saida = batidas[i+1] ? new Date(batidas[i+1].dataHora) : null;
        if (saida) minutosTotal += differenceInMinutes(saida, entrada);
        else if (isSameDay(entrada, new Date())) minutosTotal += differenceInMinutes(new Date(), entrada);
      }
    });
    const horas = Math.floor(minutosTotal / 60);
    const min = minutosTotal % 60;
    return { total: `${horas}h ${min}m`, minutos: minutosTotal };
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/funcionario/historico?inicio=${dataInicio}&fim=${dataFim}`);
      setPontos(res.data);
      setResumo(calcularHoras(res.data));
    } catch (error) { console.error("Erro"); } finally { setLoading(false); }
  }, [dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  // Abrir Modal
  const pedirAjuste = (ponto: any) => {
    setPontoSelecionado(ponto);
    // Preenche com o horário atual do ponto
    setNovoHorario(format(new Date(ponto.dataHora), 'HH:mm')); 
    setMotivo('');
    setModalAberto(true);
  };

  // Enviar Solicitação
  const enviarSolicitacao = async () => {
    if (!motivo) return alert('Digite o motivo!');
    
    // Combina a data original com o novo horário HH:mm
    const dataOriginal = format(new Date(pontoSelecionado.dataHora), 'yyyy-MM-dd');
    const dataHoraFinal = new Date(`${dataOriginal}T${novoHorario}:00`);

    try {
      await axios.post('/api/funcionario/solicitar-ajuste', {
        pontoId: pontoSelecionado.id,
        novoHorario: dataHoraFinal.toISOString(),
        motivo
      });
      alert('Solicitação enviada para o gestor!');
      setModalAberto(false);
    } catch (error) {
      alert('Erro ao enviar.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <History className="text-purple-400" />
            <h1 className="text-xl font-bold">Meus Registros</h1>
          </div>
          <Link href="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><ArrowLeft size={20} /></Link>
        </div>

        {/* Resumo e Filtros (IGUAL AO ANTERIOR) */}
        {resumo && (
          <div className="bg-purple-900/20 border border-purple-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg text-white"><Clock size={24} /></div>
              <div>
                <p className="text-xs text-purple-300 uppercase font-bold">Total no Período</p>
                <p className="text-2xl font-bold text-white">{resumo.total}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex gap-2">
            <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm" />
            <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm" />
          </div>
          <button onClick={carregar} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"><Search size={16} /> Filtrar</button>
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
                 <button 
                   onClick={() => pedirAjuste(ponto)}
                   className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                   title="Solicitar Ajuste"
                 >
                   <Edit3 size={16} />
                 </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DE SOLICITAÇÃO */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Solicitar Ajuste</h3>
              <p className="text-sm text-slate-400">Data: {format(new Date(pontoSelecionado.dataHora), 'dd/MM/yyyy')}</p>
              
              <div>
                <label className="text-xs text-slate-500 block mb-1">Horário Correto</label>
                <input type="time" value={novoHorario} onChange={e=>setNovoHorario(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-lg font-bold text-center" />
              </div>
              
              <div>
                <label className="text-xs text-slate-500 block mb-1">Motivo (Obrigatório)</label>
                <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex: Esqueci de bater, ônibus atrasou..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm h-24 resize-none" />
              </div>

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