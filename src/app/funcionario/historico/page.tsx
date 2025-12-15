'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, differenceInMinutes, isSameDay, eachDayOfInterval, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowLeft, History, Calendar, Search, Clock, Edit3, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';

export default function MeuHistorico() {
  const [pontos, setPontos] = useState<any[]>([]);
  const [empresaNome, setEmpresaNome] = useState('Carregando...');
  
  const [jornada, setJornada] = useState<any>(null);
  const [feriados, setFeriados] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<{ total: string; minutos: number } | null>(null);
  
  // Filtro Padrão: Hoje
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<'EDICAO' | 'INCLUSAO'>('EDICAO');
  const [pontoSelecionado, setPontoSelecionado] = useState<any>(null); 
  const [dataNova, setDataNova] = useState(''); 
  const [horaNova, setHoraNova] = useState(''); 
  const [tipoNovo, setTipoNovo] = useState('ENTRADA'); 
  const [motivo, setMotivo] = useState('');

  const aplicarTolerancia = (dataReal: Date, horarioMetaString: string) => {
      if (!horarioMetaString) return dataReal; 
      const [h, m] = horarioMetaString.split(':').map(Number);
      const dataMeta = new Date(dataReal);
      dataMeta.setHours(h, m, 0, 0);
      const diff = Math.abs(differenceInMinutes(dataReal, dataMeta));
      if (diff <= 10) return dataMeta;
      return dataReal;
  };

  const fixData = (d: any) => {
      if(!d) return new Date();
      const str = typeof d === 'string' ? d : d.toISOString();
      const [ano, mes, dia] = str.split('T')[0].split('-').map(Number);
      return new Date(ano, mes - 1, dia, 12, 0, 0);
  };

  // === NOVO CÁLCULO (IGNORA META EM DIAS DE FOLGA/FÉRIAS) ===
  const calcularHoras = (listaRegistros: any[], jornadaConfig: any, listaFeriados: string[]) => {
    if (!listaRegistros || listaRegistros.length === 0) return { total: '0h 0m', minutos: 0 };
    
    const agora = new Date(); 

    // 1. Mapear quais dias são "Ausência Aprovada" (Férias/Atestado)
    // Esses dias terão Meta 0 e Trabalho 0.
    const diasIsentos = new Set<string>();
    
    const ausencias = listaRegistros.filter(p => p.tipo === 'AUSENCIA');
    ausencias.forEach(aus => {
        const inicio = fixData(aus.dataHora);
        const fim = aus.extra?.dataFim ? fixData(aus.extra.dataFim) : inicio;
        try {
            eachDayOfInterval({ start: inicio, end: fim }).forEach(dia => {
                diasIsentos.add(format(dia, 'yyyy-MM-dd'));
            });
        } catch(e) {}
    });

    // Função de Meta (Agora verifica se o dia é isento)
    const getMetaDoDia = (data: Date) => {
        const dataString = format(data, 'yyyy-MM-dd');
        
        // Se for feriado OU dia de atestado/férias, a meta é 0
        if (listaFeriados.includes(dataString) || diasIsentos.has(dataString)) return 0;

        const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const diaSemana = diasMap[getDay(data)];
        const config = jornadaConfig?.[diaSemana];
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

    let minutosTrabalhadosReais = 0; // Só conta o que trabalhou fisicamente
    const contagemDia: Record<string, number> = {};

    // 2. Soma APENAS Pontos Batidos (Físicos)
    const pontosApenas = listaRegistros.filter(p => p.tipo === 'PONTO' || p.tipo === 'NORMAL');
    const sorted = [...pontosApenas].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    
    for (let i = 0; i < sorted.length; i++) {
        const pAtual = sorted[i];
        if (['ENTRADA', 'VOLTA_ALMOCO'].includes(pAtual.subTipo || pAtual.tipo)) {
            const dataEntradaReal = new Date(pAtual.dataHora);
            const diaStr = format(dataEntradaReal, 'yyyy-MM-dd');

            if (!contagemDia[diaStr]) contagemDia[diaStr] = 0; 
            const parIndex = contagemDia[diaStr]; 
            contagemDia[diaStr]++;

            const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const diaSemana = diasMap[getDay(dataEntradaReal)];
            const configDia = jornadaConfig?.[diaSemana] || {};
            
            const metaEntradaStr = parIndex === 0 ? configDia.e1 : configDia.e2;
            const metaSaidaStr = parIndex === 0 ? configDia.s1 : configDia.s2;

            const dataEntradaCalc = aplicarTolerancia(dataEntradaReal, metaEntradaStr);
            const proximo = sorted[i+1];
            
            if (proximo && ['SAIDA', 'SAIDA_ALMOCO'].includes(proximo.subTipo || proximo.tipo)) {
                const dataSaidaReal = new Date(proximo.dataHora);
                const dataSaidaCalc = aplicarTolerancia(dataSaidaReal, metaSaidaStr);
                const diff = differenceInMinutes(dataSaidaCalc, dataEntradaCalc);
                if (diff > 0 && diff < 1440) minutosTrabalhadosReais += diff;
                i++; 
            } else {
                if (isSameDay(dataEntradaReal, agora)) {
                    const diff = differenceInMinutes(agora, dataEntradaCalc);
                    if (diff > 0 && diff < 1440) minutosTrabalhadosReais += diff;
                }
            }
        }
    }

    // 3. NÃO SOMAMOS MAIS O ABONO NO "TRABALHADO"
    // O dia de férias agora tem Meta 0 e Trabalhado 0. O saldo fica 0 - 0 = 0.

    const horas = Math.floor(minutosTrabalhadosReais / 60);
    const min = minutosTrabalhadosReais % 60;
    return { total: `${horas}h ${min}m`, minutos: minutosTrabalhadosReais };
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/funcionario/historico?inicio=${dataInicio}&fim=${dataFim}`);
      if (res.data.pontos) {
          setPontos(res.data.pontos);
          setEmpresaNome(res.data.empresaNome);
          setJornada(res.data.jornada);
          setFeriados(res.data.feriados);
          setResumo(calcularHoras(res.data.pontos, res.data.jornada, res.data.feriados));
      } else { setPontos(res.data); }
    } catch (error) { console.error("Erro"); } finally { setLoading(false); }
  }, [dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  // ... (Funções Modal e Renderização - MANTIDOS) ...
  const abrirEdicao = (ponto: any) => { setModoModal('EDICAO'); setPontoSelecionado(ponto); setDataNova(format(new Date(ponto.dataHora), 'yyyy-MM-dd')); setHoraNova(format(new Date(ponto.dataHora), 'HH:mm')); setMotivo(''); setModalAberto(true); };
  const abrirInclusao = () => { setModoModal('INCLUSAO'); setPontoSelecionado(null); setDataNova(format(new Date(), 'yyyy-MM-dd')); setHoraNova(''); setTipoNovo('ENTRADA'); setMotivo(''); setModalAberto(true); };
  const enviarSolicitacao = async () => { if (!motivo || !horaNova || (modoModal === 'INCLUSAO' && !dataNova)) return alert('Preencha tudo!'); const dataBase = modoModal === 'EDICAO' ? format(new Date(pontoSelecionado.dataHora), 'yyyy-MM-dd') : dataNova; const dataHoraFinal = new Date(`${dataBase}T${horaNova}:00`); try { await axios.post('/api/funcionario/solicitar-ajuste', { pontoId: pontoSelecionado?.id, tipo: modoModal === 'INCLUSAO' ? tipoNovo : null, novoHorario: dataHoraFinal.toISOString(), motivo }); alert('Solicitação enviada!'); setModalAberto(false); } catch (error) { alert('Erro ao enviar.'); } };

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

  const pontosParaRelatorio = pontosFiltrados.map(p => ({ ...p, tipo: p.tipo === 'AUSENCIA' ? 'AUSENCIA' : 'PONTO', subTipo: p.subTipo || p.tipo, descricao: p.descricao || (p.tipo === 'AUSENCIA' ? 'Atestado/Férias' : 'Registro Manual') }));

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2"><History className="text-purple-400" /><h1 className="text-xl font-bold">Meus Registros</h1></div>
          <Link href="/" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><ArrowLeft size={20} /></Link>
        </div>

        {resumo && (
          <div className="bg-purple-900/20 border border-purple-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3"><div className="bg-purple-600 p-2.5 rounded-lg text-white"><Clock size={24} /></div><div><p className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">Total Trabalhado (Real)</p><p className="text-2xl font-bold text-white">{resumo.total}</p></div></div>
          </div>
        )}

        <div className="space-y-3">
            <button onClick={abrirInclusao} className="w-full bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 border-dashed py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"><PlusCircle size={20} /> Esqueci de Bater o Ponto</button>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex gap-2">
                    <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm outline-none" />
                    <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm outline-none" />
                </div>
                <div className="flex gap-2">
                    <button onClick={carregar} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"><Search size={16} /> Filtrar</button>
                    {pontosFiltrados.length > 0 && (<div className="flex-1"><BotaoRelatorio pontos={pontosParaRelatorio} filtro={{ inicio: dataInicio, fim: dataFim, usuario: 'Eu' }} resumoHoras={resumo} nomeEmpresa={empresaNome} modoFuncionario={true} /></div>)}
                </div>
            </div>
        </div>

        <div className="space-y-3">
          {pontosFiltrados.length === 0 && <p className="text-center text-slate-500 py-4">Nenhum registro para esta data.</p>}
          {pontosFiltrados.map((ponto) => (
            <div key={ponto.id} className={`bg-slate-900 p-4 rounded-xl border flex justify-between items-center relative overflow-hidden ${ponto.tipo === 'AUSENCIA' ? 'border-yellow-900/50 bg-yellow-900/10' : 'border-slate-800'}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${ponto.tipo === 'AUSENCIA' ? 'bg-yellow-500' : (['ENTRADA', 'VOLTA_ALMOCO'].includes(ponto.subTipo || ponto.tipo) ? 'bg-green-500' : 'bg-red-500')}`} />
              <div className="pl-3">
                <p className="font-bold text-lg text-white">
                    {format(new Date(ponto.dataHora), 'HH:mm')}
                    {ponto.tipo === 'AUSENCIA' && <span className="text-xs ml-2 font-normal text-yellow-400">({ponto.subTipo})</span>}
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-400"><Calendar size={10} />{format(new Date(ponto.dataHora), 'dd/MM/yyyy')}</div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1 block">{(ponto.subTipo || ponto.tipo)?.replace('_', ' ')}</span>
              </div>
              {ponto.tipo !== 'AUSENCIA' && (<div className="flex items-center gap-3"><button onClick={() => abrirEdicao(ponto)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"><Edit3 size={16} /></button></div>)}
            </div>
          ))}
        </div>

        {modalAberto && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4"><h3 className="text-lg font-bold text-white flex items-center gap-2">{modoModal === 'EDICAO' ? <><Edit3 size={20}/> Ajustar Ponto</> : <><PlusCircle size={20}/> Incluir Ponto</>}</h3>{modoModal === 'INCLUSAO' && (<div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-slate-500 block mb-1">Data</label><input type="date" value={dataNova} onChange={e=>setDataNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm text-center" /></div><div><label className="text-xs text-slate-500 block mb-1">Tipo</label><select value={tipoNovo} onChange={e=>setTipoNovo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm"><option value="ENTRADA">ENTRADA</option><option value="SAIDA_ALMOCO">SAÍDA ALMOÇO</option><option value="VOLTA_ALMOCO">VOLTA ALMOÇO</option><option value="SAIDA">SAÍDA</option></select></div></div>)}{modoModal === 'EDICAO' && (<p className="text-sm text-slate-400">Data: {format(new Date(pontoSelecionado.dataHora), 'dd/MM/yyyy')}</p>)}<div><label className="text-xs text-slate-500 block mb-1">Horário</label><input type="time" value={horaNova} onChange={e=>setHoraNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-lg font-bold text-center focus:border-purple-500 outline-none" /></div><div><label className="text-xs text-slate-500 block mb-1">Motivo</label><textarea value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex: Esqueci de bater..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-sm h-24 resize-none focus:border-purple-500 outline-none" /></div><div className="flex gap-2 pt-2"><button onClick={() => setModalAberto(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-bold text-sm">Cancelar</button><button onClick={enviarSolicitacao} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold text-sm">Enviar</button></div></div></div>)}
      </div>
    </div>
  );
}