'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowLeft, ShieldCheck, Search, Filter, Calendar, FileText, CheckCircle2, XCircle, Edit, Download } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LogsAuditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tipoAcao, setTipoAcao] = useState('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
        const params = new URLSearchParams({
            inicio: dataInicio,
            fim: dataFim,
            tipo: tipoAcao,
            busca: buscaTexto
        });
        const res = await axios.get(`/api/admin/logs?${params.toString()}`);
        setLogs(res.data);
    } catch (e) { 
        console.error(e); 
    } finally { 
        setLoading(false); 
    }
  }, [dataInicio, dataFim, tipoAcao, buscaTexto]);

  useEffect(() => {
    fetchLogs();
  }, []);

  // === FUNÇÃO PARA GERAR PDF ===
  const exportarPDF = () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Auditoria e Logs', 14, 20);
    
    // Subtítulo com filtros
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy')} até ${format(new Date(dataFim), 'dd/MM/yyyy')}`, 14, 34);

    // Configuração da Tabela
    const tableColumn = ["Data/Hora", "Responsável", "Ação", "Detalhes"];
    const tableRows: any[] = [];

    logs.forEach(log => {
      const logData = [
        format(new Date(log.dataHora), 'dd/MM/yyyy HH:mm'),
        log.adminNome || 'Sistema',
        log.acao.replace('_', ' '),
        log.detalhes,
      ];
      tableRows.push(logData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [75, 85, 99] }, // Cor cinza escuro (Slate-600)
      alternateRowStyles: { fillColor: [240, 240, 240] }, // Listrado leve
    });

    doc.save(`auditoria_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  const renderBadge = (acao: string) => {
      const estiloBase = "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit";
      
      if (acao.includes('APROVA')) return <span className={`${estiloBase} bg-emerald-500/20 text-emerald-400 border border-emerald-500/30`}><CheckCircle2 size={12}/> Aprovado</span>;
      if (acao.includes('REJEI')) return <span className={`${estiloBase} bg-red-500/20 text-red-400 border border-red-500/30`}><XCircle size={12}/> Rejeitado</span>;
      if (acao.includes('EDICAO') || acao.includes('AJUSTE')) return <span className={`${estiloBase} bg-blue-500/20 text-blue-400 border border-blue-500/30`}><Edit size={12}/> Edição</span>;
      if (acao.includes('FERIAS')) return <span className={`${estiloBase} bg-purple-500/20 text-purple-400 border border-purple-500/30`}><PlaneIcon size={12}/> Férias</span>;
      
      return <span className={`${estiloBase} bg-slate-700 text-slate-300 border border-slate-600`}>{acao.replace('_', ' ')}</span>;
  };

  const PlaneIcon = ({size}: {size:number}) => <FileText size={size}/>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 font-sans relative overflow-hidden">
      
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-green-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-3 rounded-2xl border border-white/10 shadow-xl">
                    <ShieldCheck className="text-emerald-400" size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Auditoria & Logs</h1>
                    <p className="text-sm text-slate-400">Rastreabilidade completa de todas as ações do sistema.</p>
                </div>
            </div>
            <Link href="/admin" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95">
                <ArrowLeft size={18}/> Voltar
            </Link>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row gap-4 items-end">
            
            <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">De</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5">
                        <Calendar size={16} className="text-slate-500"/>
                        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-transparent text-sm text-white w-full outline-none calendar-dark"/>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Até</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5">
                        <Calendar size={16} className="text-slate-500"/>
                        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-transparent text-sm text-white w-full outline-none calendar-dark"/>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Tipo de Ação</label>
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-3 text-slate-500"/>
                        <select value={tipoAcao} onChange={e => setTipoAcao(e.target.value)} className="bg-slate-950 border border-white/10 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 w-full outline-none appearance-none cursor-pointer hover:border-emerald-500/50 transition-colors">
                            <option value="TODOS">Todas as Ações</option>
                            <option value="APROVACAO">Aprovações</option>
                            <option value="REJEICAO">Rejeições</option>
                            <option value="EDICAO">Edições Manuais</option>
                            <option value="EXCLUSAO">Exclusões</option>
                            <option value="FERIAS">Lançamento Férias</option>
                            <option value="SOLICITACAO">Solicitações Func.</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Buscar Detalhes</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-slate-500"/>
                        <input type="text" value={buscaTexto} onChange={e => setBuscaTexto(e.target.value)} placeholder="Nome, motivo..." className="bg-slate-950 border border-white/10 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 w-full outline-none focus:border-emerald-500/50 transition-colors"/>
                    </div>
                </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex gap-2 w-full lg:w-auto">
                <button onClick={fetchLogs} className="flex-1 lg:flex-none px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Search size={18} /> <span className="hidden xl:inline">Filtrar</span>
                </button>
                
                {/* BOTÃO DE PDF ADICIONADO AQUI */}
                <button onClick={exportarPDF} disabled={logs.length === 0} className="flex-1 lg:flex-none px-5 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Download size={18} /> PDF
                </button>
            </div>
        </div>

        {/* TABELA DE RESULTADOS */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            {loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
                    <div className="w-8 h-8 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-sm">Buscando na auditoria...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                                <th className="p-5">Data e Hora</th>
                                <th className="p-5">Responsável / Autor</th>
                                <th className="p-5">Ação Realizada</th>
                                <th className="p-5 w-1/2">Detalhes da Alteração</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {logs.length > 0 ? logs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-5 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-200">{format(new Date(log.dataHora), 'dd/MM/yyyy')}</span>
                                            <span className="text-xs text-slate-500 font-mono">{format(new Date(log.dataHora), 'HH:mm:ss')}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-white/5">
                                                {log.adminNome?.charAt(0) || 'S'}
                                            </div>
                                            <span className="font-medium text-slate-300">{log.adminNome || 'Sistema'}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        {renderBadge(log.acao)}
                                    </td>
                                    <td className="p-5">
                                        <p className="text-slate-300 leading-relaxed text-xs md:text-sm">{log.detalhes}</p>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-50">
                                            <FileText size={40} className="text-slate-600"/>
                                            <p className="text-slate-400">Nenhum registro encontrado com estes filtros.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        
        <p className="text-center text-slate-600 text-xs">Mostrando os últimos registros encontrados. Refine a busca se necessário.</p>

      </div>
    </div>
  );
}