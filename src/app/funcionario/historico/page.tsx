'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, differenceInMinutes, isSameDay } from 'date-fns';
import { ArrowLeft, History, Calendar, Search, Clock, Edit3, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';

export default function MeuHistorico() {
  const [pontos, setPontos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<{ total: string; minutos: number } | null>(null);
  
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Estados do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<'EDICAO' | 'INCLUSAO'>('EDICAO');
  
  const [pontoSelecionado, setPontoSelecionado] = useState<any>(null); // Só para edição
  const [dataNova, setDataNova] = useState(''); // Para inclusão (Dia)
  const [horaNova, setHoraNova] = useState(''); // Para inclusão/edição (Hora)
  const [tipoNovo, setTipoNovo] = useState('ENTRADA'); // Para inclusão
  const [motivo, setMotivo] = useState('');

  // ... (Cálculo de horas MANTIDO IGUAL - Copie do seu código anterior para economizar espaço) ...
  const calcularHoras = (listaPontos: any[]) => {
    if (!listaPontos || listaPontos.length === 0) return { total: '0h 0m', minutos: 0 };
    const sorted = [...listaPontos].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    let minutosTotal = 0;
    const pontosPorDia: Record<string, any[]> = {};
    sorted.forEach(p => {
      const dataIso = new Date(p.dataHora).toISOString().split('T')[0];
      if (!pontosPorDia[dataIso]) pontosPorDia[dataIso] = [];
      pontosPorDia[dataIso].push(p);
    });
    Object.keys(pontosPorDia).forEach(dia => {
      const batidas = pontosPorDia[dia];
      for (let i = 0; i < batidas.length; i += 2) {
        const entrada = new Date(batidas[i].dataHora);
        if (batidas[i+1]) {
          const saida = new Date(batidas[i+1].dataHora);
          const diffMins = Math.floor((saida.getTime() - entrada.getTime()) / 1000 / 60);
          if (diffMins > 0) minutosTotal += diffMins;
        }
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

  // Abrir Modal de EDIÇÃO (Alterar existente)
  const abrirEdicao = (ponto: any) => {
    setModoModal('EDICAO');
    setPontoSelecionado(ponto);
    setDataNova(format(new Date(ponto.dataHora), 'yyyy-MM-dd')); // Data fixa visual
    setHoraNova(format(new Date(ponto.dataHora), 'HH:mm')); 
    setMotivo('');
    setModalAberto(true);
  };

  // Abrir Modal de INCLUSÃO (Novo ponto)
  const abrirInclusao = () => {
    setModoModal('INCLUSAO');
    setPontoSelecionado(null);
    setDataNova(format(new Date(), 'yyyy-MM-dd')); // Hoje como padrão
    setHoraNova('');
    setTipoNovo('ENTRADA');
    setMotivo('');
    setModalAberto(true);
  };

  const enviarSolicitacao = async () => {
    if (!motivo || !horaNova || (modoModal === 'INCLUSAO' && !dataNova)) return alert('Preencha tudo!');
    
    // Constrói a data final
    // Na edição, usa a data do ponto original. Na inclusão, usa a data que o usuário escolheu.
    const dataBase = modoModal === 'EDICAO' ? format(new Date(pontoSelecionado.dataHora), 'yyyy-MM-dd') : dataNova;
    const dataHoraFinal = new Date(`${dataBase}T${horaNova}:00`);

    try {
      await axios.post('/api/funcionario/solicitar-ajuste', {
        pontoId: pontoSelecionado?.id, // Se for inclusão, isso vai null
        tipo: modoModal === 'INCLUSAO' ? tipoNovo : null,
        novoHorario: dataHoraFinal.toISOString(),
        motivo
      });
      alert('Solicitação enviada!');
      setModalAberto(false);
    } catch (error) { alert('Erro ao enviar.'); }
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

        {/* Resumo */}
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

        {/* Filtros e Botão de Inclusão */}
        <div className="space-y-3">
            {/* BOTÃO ESQUECI DE BATER (NOVO) */}
            <button 
                onClick={abrirInclusao}
                className="w-full bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 border-dashed py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
                <PlusCircle size={20} /> Esqueci de Bater o Ponto
            </button>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex gap-2">
                    <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm outline-none" />
                    <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm outline-none" />
                </div>
                <div className="flex gap-2">
                    <button onClick={carregar} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"><Search size={16} /> Filtrar</button>
                    {pontos.length > 0 && <div className="flex-1"><BotaoRelatorio pontos={pontos} filtro={{ inicio: dataInicio, fim: dataFim, usuario: pontos[0]?.usuario.nome || 'Eu' }} resumoHoras={resumo} /></div>}
                </div>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1 block">{ponto.tipo ? ponto.tipo.replace('_', ' ') : 'PONTO'}</span>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => abrirEdicao(ponto)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"><Edit3 size={16} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL UNIVERSAL (SERVE PARA INCLUSÃO E EDIÇÃO) */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {modoModal === 'EDICAO' ? <><Edit3 size={20}/> Ajustar Ponto</> : <><PlusCircle size={20}/> Incluir Ponto</>}
              </h3>
              
              {/* Se for Inclusão, permite escolher a DATA e o TIPO */}
              {modoModal === 'INCLUSAO' && (
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Data</label>
                          <input type="date" value={dataNova} onChange={e=>setDataNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm text-center" />
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Tipo</label>
                          <select value={tipoNovo} onChange={e=>setTipoNovo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm">
                              <option value="ENTRADA">ENTRADA</option>
                              <option value="SAIDA_ALMOCO">SAÍDA ALMOÇO</option>
                              <option value="VOLTA_ALMOCO">VOLTA ALMOÇO</option>
                              <option value="SAIDA">SAÍDA</option>
                          </select>
                      </div>
                  </div>
              )}

              {/* Se for Edição, mostra a data fixa */}
              {modoModal === 'EDICAO' && (
                  <p className="text-sm text-slate-400">Data: {format(new Date(pontoSelecionado.dataHora), 'dd/MM/yyyy')}</p>
              )}
              
              <div>
                <label className="text-xs text-slate-500 block mb-1">Horário</label>
                <input type="time" value={horaNova} onChange={e=>setHoraNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-lg font-bold text-center focus:border-purple-500 outline-none" />
              </div>
              
              <div>
                <label className="text-xs text-slate-500 block mb-1">Motivo (Obrigatório)</label>
                <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex: Esqueci de bater..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm h-24 resize-none focus:border-purple-500 outline-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setModalAberto(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-bold text-sm">Cancelar</button>
                <button onClick={enviarSolicitacao} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold text-sm">Enviar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}