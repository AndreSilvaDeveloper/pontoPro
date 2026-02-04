'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, differenceInMinutes, isSameDay, getDay, eachDayOfInterval, getISOWeek, getYear } from 'date-fns';
import { ArrowLeft, History, Calendar, Search, Clock, Edit3, PlusCircle, LogIn, LogOut, AlertTriangle, X, Save, FileText, CheckCircle2, XCircle, ListFilter, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRef } from 'react';


// Função auxiliar de data
const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export default function MeuHistorico() {
  // === ESTADOS ===
  const [abaAtiva, setAbaAtiva] = useState<'PONTO' | 'SOLICITACOES'>('PONTO');
  
  // Dados de Ponto
  const [pontos, setPontos] = useState<any[]>([]);
  const [empresaNome, setEmpresaNome] = useState('Carregando...');
  const [jornada, setJornada] = useState<any>(null);
  const [feriados, setFeriados] = useState<string[]>([]);
  
  // Agora o resumo guarda mais dados (igual ao admin)
  const [resumo, setResumo] = useState<{ total: string; saldo: string; saldoPositivo: boolean } | null>(null);
  
  // Dados de Solicitações
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<'EDICAO' | 'INCLUSAO'>('EDICAO');
  const [pontoSelecionado, setPontoSelecionado] = useState<any>(null); 
  const [dataNova, setDataNova] = useState(''); 
  const [horaNova, setHoraNova] = useState(''); 
  const [tipoNovo, setTipoNovo] = useState('ENTRADA'); 
  const [motivo, setMotivo] = useState('');

  const searchParams = useSearchParams();
const router = useRouter();
const abriuAutoRef = useRef(false);

const ajustarId = searchParams.get('ajustar');


 
  // === CÁLCULO INTELIGENTE (COM TOLERÂNCIA CLT DE 10 MINUTOS) ===
  const calcularHorasAvancado = (listaRegistros: any[], jornadaConfig: any, listaFeriados: string[]) => {
    // Se não tiver registros e nem intervalo definido, zera tudo
    if (!listaRegistros) return { total: '0h 0m', saldo: '0h 0m', saldoPositivo: true };

    const agora = new Date();

    // 1. Função Auxiliar: Normalizar data (remove horas)
    const toDateStr = (d: Date | string) => format(new Date(d), 'yyyy-MM-dd');

    // 2. Organizar os pontos por dia (Map: '2024-01-09' => [pontos...])
    const pontosPorDia: Record<string, any[]> = {};
    const diasComPontos = new Set<string>();
    
    // Filtra apenas pontos válidos e organiza
    listaRegistros.forEach(p => {
      if (p.tipo !== 'AUSENCIA') {
        const dia = toDateStr(p.dataHora);
        if (!pontosPorDia[dia]) pontosPorDia[dia] = [];
        pontosPorDia[dia].push(p);
        diasComPontos.add(dia);
      }
    });

    // Ordena os pontos dentro de cada dia
    Object.keys(pontosPorDia).forEach(dia => {
      pontosPorDia[dia].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    });

    // 3. Identificar Ausências/Isenções
    const diasIsentos = new Set<string>();
    const ausencias = listaRegistros.filter(p => p.tipo === 'AUSENCIA');
    ausencias.forEach(aus => {
      const inicio = new Date(aus.dataHora);
      const fim = aus.extra?.dataFim ? new Date(aus.extra.dataFim) : inicio;
      try {
        eachDayOfInterval({ start: inicio, end: fim }).forEach(d => diasIsentos.add(toDateStr(d)));
      } catch (e) {}
    });

    // 4. Identificar Semanas com Sábado Trabalhado (para a regra híbrida)
    const semanasComSabado = new Set<string>();
    Object.keys(pontosPorDia).forEach(diaStr => {
      const data = criarDataLocal(diaStr);
      if (getDay(data) === 6) {
        semanasComSabado.add(`${getYear(data)}-${getISOWeek(data)}`);
      }
    });

    // === FUNÇÃO DE META (Mantendo a lógica híbrida que criamos antes) ===
    const getMetaDoDia = (data: Date) => {
      const dataString = format(data, 'yyyy-MM-dd');
      if (feriados.includes(dataString) || diasIsentos.has(dataString)) return 0;

      const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const diaSemanaIndex = getDay(data);
      const diaSemana = diasMap[diaSemanaIndex];

      const chaveSemanaAtual = `${getYear(data)}-${getISOWeek(data)}`;
      const trabalhouSabado = semanasComSabado.has(chaveSemanaAtual);

      const config = jornadaConfig[diaSemana];
      
      // Função auxiliar (agora definida no topo para ser usada na lógica)
      const calcDiff = (i: string, f: string) => {
        if (!i || !f) return 0;
        const [h1, m1] = i.split(':').map(Number);
        const [h2, m2] = f.split(':').map(Number);
        let diff = h2 * 60 + m2 - (h1 * 60 + m1);
        if (diff < 0) diff += 1440;
        return diff;
      };

      // Calcula quanto vale a configuração "Oficial" do banco de dados para esse dia
      const minutosConfigurados = config && config.ativo 
        ? calcDiff(config.e1, config.s1) + calcDiff(config.e2, config.s2) 
        : 0;

      // --- LÓGICA HÍBRIDA INTELIGENTE ---
      
      // Segunda a Sexta
      if (diaSemanaIndex >= 1 && diaSemanaIndex <= 5) {
        if (trabalhouSabado) {
            // Se não tem configuração, assume 8h padrão
            if (!minutosConfigurados) return 480;

            // AQUI ESTÁ O PULO DO GATO:
            // Se a configuração pede MAIS que 8h40 (520min), é provável que seja uma escala de compensação.
            // Como ele trabalhou no sábado, essa compensação perde a validade e a meta deve ser 8h (480min).
            if (minutosConfigurados > 520) return 480;

            // Se for uma jornada de 8h30 (510min) ou 8h (480min), respeitamos a configuração.
            return minutosConfigurados;
        }
      }

      // Sábado
      if (diaSemanaIndex === 6) {
        const configSab = jornadaConfig['sab'];
        const temConfiguracao = configSab && configSab.ativo;

        // Se trabalhou sábado mas NÃO tem horário configurado no painel, assume 4h (padrão)
        if (trabalhouSabado && !temConfiguracao) return 240;
      }
      
      // Se não caiu nas exceções acima, segue o calculado oficial
      return minutosConfigurados;
    };

    // === LOOP PRINCIPAL: CALCULAR DIA A DIA ===
    let saldoTotalBanco = 0;
    let minutosTotalTrabalhado = 0;

    let loopData = criarDataLocal(dataInicio);
    const fimData = criarDataLocal(dataFim);

    while (loopData <= fimData) {
      if (loopData <= agora) {
        const diaStr = toDateStr(loopData);
        
        // A. Calcula Meta do Dia
        const metaDia = getMetaDoDia(loopData);

        // B. Calcula Trabalhado no Dia
        let trabalhadoDia = 0;
        const pontosDia = pontosPorDia[diaStr] || [];

        for (let i = 0; i < pontosDia.length; i++) {
          const pEntrada = pontosDia[i];
          const tipoEnt = pEntrada.subTipo || pEntrada.tipo;
          
          if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipoEnt)) {
            const pSaida = pontosDia[i + 1];
            const tipoSaida = pSaida ? (pSaida.subTipo || pSaida.tipo) : null;
            
            const entrada = new Date(pEntrada.dataHora);

            if (pSaida && ['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
              const saida = new Date(pSaida.dataHora);
              let diff = differenceInMinutes(saida, entrada);
              
              if (diff > 0 && diff < 1440) trabalhadoDia += diff;

              // Crédito Café
              if (tipoSaida === 'SAIDA_INTERVALO') {
                const pVolta = pontosDia[i + 2];
                if (pVolta) {
                   const volta = new Date(pVolta.dataHora);
                   const intervalo = differenceInMinutes(volta, saida);
                   if (intervalo > 0) trabalhadoDia += Math.min(intervalo, 15);
                }
              }
              i++;
            } else if (isSameDay(entrada, agora)) {
              // Em andamento (hoje)
              const diff = differenceInMinutes(agora, entrada);
              if (diff > 0) trabalhadoDia += diff;
            }
          }
        }

        // C. Soma ao Total Geral Trabalhado
        minutosTotalTrabalhado += trabalhadoDia;

        // D. Lógica de Banco e Tolerância (CLT)
        // Só calcula banco se o dia não for isento (atestado)
        if (!diasIsentos.has(diaStr)) {
          let saldoDia = trabalhadoDia - metaDia;

          // === A MÁGICA DA TOLERÂNCIA DE 10 MINUTOS ===
          // Se a diferença (para mais ou para menos) for <= 10, ignora.
          if (Math.abs(saldoDia) <= 10) {
            saldoDia = 0;
          }

          saldoTotalBanco += saldoDia;
        }
      }
      loopData.setDate(loopData.getDate() + 1);
    }

    // Formatação Final
    const formatarHoras = (min: number) => {
      const sinal = min < 0 ? '-' : '';
      const absMin = Math.abs(min);
      return `${sinal}${Math.floor(absMin / 60)}h ${absMin % 60}m`;
    };

    return {
      total: formatarHoras(minutosTotalTrabalhado),
      saldo: formatarHoras(saldoTotalBanco),
      saldoPositivo: saldoTotalBanco >= 0
    };
  };

  // === CARREGAMENTO DE DADOS ===
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const resHistorico = await axios.get(`/api/funcionario/historico?inicio=${dataInicio}&fim=${dataFim}`);
      
      if (resHistorico.data.pontos) {
          setPontos(resHistorico.data.pontos);
          setEmpresaNome(resHistorico.data.empresaNome);
          setJornada(resHistorico.data.jornada);
          setFeriados(resHistorico.data.feriados);
          
          // Usa a nova lógica poderosa
          setResumo(calcularHorasAvancado(resHistorico.data.pontos, resHistorico.data.jornada, resHistorico.data.feriados));
      } else { 
          setPontos(resHistorico.data); 
      }

      const resSolicitacoes = await axios.get('/api/funcionario/minhas-solicitacoes');
      setSolicitacoes(resSolicitacoes.data);

    } catch (error) { console.error("Erro"); } finally { setLoading(false); }
  }, [dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
  if (!ajustarId) return;
  if (abriuAutoRef.current) return;

  // Só tenta quando já carregou e já tem pontos
  if (loading) return;
  if (!pontos || pontos.length === 0) return;

  const pontoEncontrado = pontos.find(p => p.id === ajustarId);

  if (pontoEncontrado) {
    abriuAutoRef.current = true;
    abrirEdicao(pontoEncontrado);

    // Remove o param da URL pra não abrir de novo em re-render
    setTimeout(() => {
      router.replace('/funcionario/historico', { scroll: false });
    }, 50);
  } else {
    // Se não achar (id inválido/fora do filtro), limpa o param e avisa
    abriuAutoRef.current = true;
    setTimeout(() => {
      router.replace('/funcionario/historico', { scroll: false });
      window.alert('Não encontramos o registro para ajuste. Verifique o período do filtro ou tente novamente.');
    }, 50);
  }
}, [ajustarId, loading, pontos, router]);


  // === AÇÕES DO MODAL ===
  const abrirEdicao = (ponto: any) => { setModoModal('EDICAO'); setPontoSelecionado(ponto); setDataNova(format(new Date(ponto.dataHora), 'yyyy-MM-dd')); setHoraNova(format(new Date(ponto.dataHora), 'HH:mm')); setMotivo(''); setModalAberto(true); };
  const abrirInclusao = () => { setModoModal('INCLUSAO'); setPontoSelecionado(null); setDataNova(format(new Date(), 'yyyy-MM-dd')); setHoraNova(''); setTipoNovo('ENTRADA'); setMotivo(''); setModalAberto(true); };
  
  const enviarSolicitacao = async () => { 
      if (!motivo || !horaNova || (modoModal === 'INCLUSAO' && !dataNova)) return alert('Preencha tudo!'); 
      const dataBase = modoModal === 'EDICAO' ? format(new Date(pontoSelecionado.dataHora), 'yyyy-MM-dd') : dataNova; 
      const dataHoraFinal = new Date(`${dataBase}T${horaNova}:00`); 
      
      try { 
          await axios.post('/api/funcionario/solicitar-ajuste', { 
              pontoId: pontoSelecionado?.id, 
              tipo: modoModal === 'INCLUSAO' ? tipoNovo : null, 
              novoHorario: dataHoraFinal.toISOString(), 
              motivo 
          }); 
          alert('Solicitação enviada! Acompanhe na aba "Solicitações".'); 
          setModalAberto(false);
          carregar(); 
      } catch (error: any) {
        const data = error?.response?.data ?? {};
        const msg = data?.erro;
        const code = data?.code;

        if (code === 'USE_AJUSTE') {
            window.alert(msg || 'Você já registrou esse ponto hoje. Em vez de INCLUIR, solicite AJUSTE.');
            return;
        }

        window.alert(msg || 'Erro ao enviar.');
        }

    };

  // === FILTROS DE PONTOS ===
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

  const getIconePonto = (tipo: string) => {
      if (tipo === 'AUSENCIA') return <AlertTriangle size={18} className="text-yellow-500"/>;
      if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO'].includes(tipo)) return <LogIn size={18} className="text-emerald-400"/>;
      if (['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipo)) return <LogOut size={18} className="text-rose-400"/>;
      return <Clock size={18} className="text-slate-400"/>;
  }

  const getCorStatus = (tipo: string) => {
      if (tipo === 'AUSENCIA') return 'border-yellow-500/50 bg-yellow-500/5';
      if (['ENTRADA', 'VOLTA_ALMOCO'].includes(tipo)) return 'border-emerald-500/30 bg-emerald-500/5';
      if (['SAIDA'].includes(tipo)) return 'border-rose-500/30 bg-rose-500/5';
      return 'border-slate-700 bg-slate-800/30';
  }

  const renderSolicitacoes = () => {
      if (solicitacoes.length === 0) return <div className="text-center py-10 opacity-50"><p className="text-slate-500 text-sm">Nenhuma solicitação encontrada.</p></div>;
      return (
          <div className="space-y-3">
              {solicitacoes.map(sol => (
                  <div key={sol.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${sol.status === 'APROVADO' ? 'bg-emerald-500/20 text-emerald-400' : sol.status === 'REJEITADO' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {sol.status}
                              </span>
                              <span className="text-xs text-slate-500">{format(new Date(sol.criadoEm), 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                          <p className="text-sm font-bold text-white mb-0.5">
                              {sol.novoHorario ? `Ajuste para: ${format(new Date(sol.novoHorario), 'dd/MM HH:mm')}` : 'Justificativa de Ausência'}
                          </p>
                          <p className="text-xs text-slate-400 italic">"{sol.motivo}"</p>
                          {sol.observacaoAdmin && (
                              <p className="text-xs text-slate-500 mt-1 border-t border-slate-800 pt-1">Admin: {sol.observacaoAdmin}</p>
                          )}
                      </div>
                      <div className="pl-3">
                          {sol.status === 'APROVADO' ? <CheckCircle2 className="text-emerald-500" size={20} /> : sol.status === 'REJEITADO' ? <XCircle className="text-red-500" size={20} /> : <Clock className="text-amber-500" size={20} />}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 font-sans relative overflow-hidden">
      
      <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md mx-auto space-y-6 relative z-10">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between pt-2 pb-4">
          <div className="flex items-center gap-3">
              <div className="bg-white/5 p-2 rounded-xl border border-white/10"><History className="text-purple-400" size={20} /></div>
              <div>
                  <h1 className="text-lg font-bold text-white leading-none">Minhas Atividades</h1>
                  <p className="text-xs text-slate-400 mt-1">{empresaNome}</p>
              </div>
          </div>
          <Link href="/funcionario" className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all active:scale-95"><ArrowLeft size={18} /></Link>
        </div>
''
        {/* SELETOR DE ABAS */}
        <div className="bg-slate-900/60 p-1 rounded-xl flex gap-1 border border-white/5">
            <button onClick={() => setAbaAtiva('PONTO')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${abaAtiva === 'PONTO' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Calendar size={14} /> Espelho de Ponto
            </button>
            <button onClick={() => setAbaAtiva('SOLICITACOES')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${abaAtiva === 'SOLICITACOES' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <ListFilter size={14} /> Minhas Solicitações
            </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        {abaAtiva === 'PONTO' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                
                {/* CARDS DE RESUMO (IGUAIS AO ADMIN) */}
                {resumo && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-md border border-purple-500/20 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
                        <div className="flex justify-between items-start mb-2">
                            <Clock size={20} className="text-purple-400"/>
                            <span className="text-[10px] text-purple-200 uppercase font-bold tracking-widest">Trabalhado</span>
                        </div>
                        <p className="text-2xl font-bold text-white tracking-tight">{resumo.total}</p>
                    </div>

                    <div className={`backdrop-blur-md border p-4 rounded-2xl flex flex-col justify-between shadow-xl ${resumo.saldoPositivo ? 'bg-emerald-900/20 border-emerald-500/20' : 'bg-rose-900/20 border-rose-500/20'}`}>
                        <div className="flex justify-between items-start mb-2">
                            {resumo.saldoPositivo ? <TrendingUp size={20} className="text-emerald-400"/> : <TrendingDown size={20} className="text-rose-400"/>}
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${resumo.saldoPositivo ? 'text-emerald-200' : 'text-rose-200'}`}>Banco</span>
                        </div>
                        <p className={`text-2xl font-bold tracking-tight ${resumo.saldoPositivo ? 'text-emerald-400' : 'text-rose-400'}`}>{resumo.saldo}</p>
                    </div>
                </div>
                )}

                {/* FILTROS E BOTÃO ESQUECI */}
                <div className="space-y-4">
                    <button onClick={abrirInclusao} className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 border-dashed py-4 rounded-xl font-bold text-sm text-slate-300 flex items-center justify-center gap-2 transition-all hover:text-white active:scale-95">
                        <PlusCircle size={18} className="text-purple-400"/> Esqueci de Bater o Ponto
                    </button>
                    
                    <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 space-y-3 shadow-lg">
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">De</label>
                                <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 p-2.5 rounded-xl text-white text-sm outline-none focus:border-purple-500 transition-colors text-center" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Até</label>
                                <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 p-2.5 rounded-xl text-white text-sm outline-none focus:border-purple-500 transition-colors text-center" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={carregar} disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50">
                                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Search size={16} /> Filtrar</>}
                            </button>
                            {pontosFiltrados.length > 0 && (
                                <div className="flex-1">
                                    <BotaoRelatorio 
                                        pontos={pontosParaRelatorio} 
                                        filtro={{ 
                                            inicio: criarDataLocal(dataInicio), 
                                            fim: criarDataLocal(dataFim), 
                                            usuario: 'Eu' 
                                        }} 
                                        resumoHoras={resumo} 
                                        nomeEmpresa={empresaNome} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* LISTA DE PONTOS */}
                <div className="space-y-3 pb-8">
                {pontosFiltrados.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <History size={48} className="mx-auto mb-3 text-slate-600"/>
                        <p className="text-slate-500 text-sm">Nenhum registro encontrado.</p>
                    </div>
                )}
                
                {pontosFiltrados.map((ponto) => {
                    const tipo = ponto.subTipo || ponto.tipo;
                    return (
                        <div key={ponto.id} className={`group relative p-4 rounded-2xl border backdrop-blur-sm transition-all hover:bg-white/[0.03] ${getCorStatus(ponto.tipo === 'AUSENCIA' ? 'AUSENCIA' : tipo)}`}>
                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl bg-slate-950/30 border border-white/5`}>
                                    {getIconePonto(ponto.tipo === 'AUSENCIA' ? 'AUSENCIA' : tipo)}
                                </div>
                                <div>
                                    <p className="font-bold text-lg text-white font-mono tracking-tight">
                                        {format(new Date(ponto.dataHora), 'HH:mm')}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                        <Calendar size={10} />
                                        {format(new Date(ponto.dataHora), 'dd/MM/yyyy')}
                                        <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider ml-1">
                                            {(tipo)?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {ponto.tipo !== 'AUSENCIA' && (
                            <button
                                onClick={() => abrirEdicao(ponto)}
                                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                                title="Solicitar Ajuste"
                            >
                                <Edit3 size={16} />
                                Ajustar Ponto
                            </button>
                            )}


                        </div>
                        </div>
                    );
                })}
                </div>
            </div>
        ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 pb-8">
                <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-lg mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1"><ListFilter size={16} className="text-purple-400"/> Acompanhamento</h3>
                    <p className="text-xs text-slate-400">Aqui você vê o status de todas as suas justificativas e ajustes manuais.</p>
                </div>
                {renderSolicitacoes()}
            </div>
        )}

        {/* MODAL DE AJUSTE */}
        {modalAberto && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setModalAberto(false)} />
                <div className="bg-[#0f172a] border border-slate-700 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-5 relative z-10 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {modoModal === 'EDICAO' ? <><Edit3 size={20} className="text-purple-400"/> Ajustar Horário</> : <><PlusCircle size={20} className="text-emerald-400"/> Incluir Registro</>}
                        </h3>
                        <button onClick={() => setModalAberto(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                    </div>
                    {modoModal === 'INCLUSAO' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Data</label>
                                <input type="date" value={dataNova} onChange={e=>setDataNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm text-center outline-none focus:border-purple-500 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Tipo</label>
                                <select value={tipoNovo} onChange={e=>setTipoNovo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-xs outline-none focus:border-purple-500 appearance-none">
                                    <option value="ENTRADA">ENTRADA</option>
                                    <option value="SAIDA_ALMOCO">SAÍDA ALMOÇO</option>
                                    <option value="VOLTA_ALMOCO">VOLTA ALMOÇO</option>
                                    <option value="SAIDA">SAÍDA</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {modoModal === 'EDICAO' && (
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                            <p className="text-xs text-slate-400 uppercase tracking-widest">Data Original</p>
                            <p className="text-white font-bold">{format(new Date(pontoSelecionado.dataHora), 'dd/MM/yyyy')}</p>
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Novo Horário</label>
                        <input type="time" value={horaNova} onChange={e=>setHoraNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white text-3xl font-bold text-center outline-none focus:border-purple-500 transition-all focus:ring-2 focus:ring-purple-500/20" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Justificativa (Obrigatório)</label>
                        <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex: Esqueci de bater, estava em reunião..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm h-24 resize-none outline-none focus:border-purple-500 transition-colors" />
                    </div>
                    <button onClick={enviarSolicitacao} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-purple-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Save size={18} /> Enviar Solicitação
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}