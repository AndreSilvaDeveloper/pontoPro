'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale'; 
import { Download, FileText, FileJson, ChevronDown, FileCode, Printer, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { gerarAFD, gerarAFDT } from '@/utils/geradorMTE'; 

// === HELPER: Converter Imagem URL para Base64 (Corrige o problema da assinatura) ===
const getBase64ImageFromURL = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url, { mode: 'cors' });
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Erro ao carregar assinatura:", error);
        return null;
    }
};

interface Props {
  pontos: any[];
  filtro: { inicio: Date; fim: Date; usuario: string };
  resumoHoras: any;
  assinaturaUrl?: string | null;
  nomeEmpresa: string;
  dadosEmpresaCompleto?: any;
}

export default function BotaoRelatorio({ pontos, filtro, resumoHoras, assinaturaUrl, nomeEmpresa, dadosEmpresaCompleto }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  // === 1. LÓGICA ANTIGA DE PROCESSAMENTO (Que você prefere) ===
  const processarDados = () => {
    const diasMap: Record<string, any> = {};
    
    // Normaliza
    const pontosNormalizados = pontos.map((p: any) => ({
        ...p,
        realTipo: p.tipo === 'PONTO' ? p.subTipo : p.tipo,
        dataObj: new Date(p.dataHora),
        uid: p.usuario?.id || 'desc',
        unome: p.usuario?.nome || 'Desconhecido'
    }));

    // Ordena
    const pontosOrdenados = [...pontosNormalizados].sort((a:any, b:any) => {
        if (a.unome < b.unome) return -1;
        if (a.unome > b.unome) return 1;
        return a.dataObj.getTime() - b.dataObj.getTime();
    });

    // A. Processa Ausências (Preenche dias inteiros)
    pontosOrdenados.forEach((p: any) => {
        if (p.realTipo === 'AUSENCIA' || p.tipo === 'AUSENCIA') {
            const dtInicio = new Date(p.dataHora);
            const dtFim = p.extra?.dataFim ? new Date(p.extra.dataFim) : dtInicio;
            try {
                const intervalo = eachDayOfInterval({ start: dtInicio, end: dtFim });
                intervalo.forEach((diaDoIntervalo) => {
                    const dateKey = format(diaDoIntervalo, 'yyyy-MM-dd');
                    const uniqueKey = `${p.uid}_${dateKey}`;
                    
                    if(!diasMap[uniqueKey]) {
                        diasMap[uniqueKey] = { 
                            data: diaDoIntervalo, 
                            nomeFunc: p.unome,
                            e1:'-', s1:'-', e2:'-', s2:'-', obs: '' 
                        };
                    }
                    const motivo = p.descricao || p.motivo || 'Sem motivo';
                    diasMap[uniqueKey].obs = `AUSÊNCIA: ${motivo}`;
                    diasMap[uniqueKey].isAusencia = true;
                });
            } catch(e) {}
        }
    });

    // B. Processa Pontos (Pares Ent/Sai)
    for (let i = 0; i < pontosOrdenados.length; i++) {
        const p = pontosOrdenados[i];
        if (p.tipo === 'AUSENCIA' || p.realTipo === 'AUSENCIA') continue;

        if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(p.realTipo)) {
            const dateKey = format(p.dataObj, 'yyyy-MM-dd');
            const uniqueKey = `${p.uid}_${dateKey}`;

            if (!diasMap[uniqueKey]) {
                diasMap[uniqueKey] = { 
                    data: p.dataObj, 
                    nomeFunc: p.unome,
                    e1:'', s1:'', e2:'', s2:'', obs: '' 
                };
            }

            const horaFormatada = format(p.dataObj, 'HH:mm');
            // Se for a primeira batida do dia ou volta de almoço
            if (!diasMap[uniqueKey].e1) diasMap[uniqueKey].e1 = horaFormatada;
            else diasMap[uniqueKey].e2 = horaFormatada;

            // Tenta achar a saída correspondente
            const proximo = pontosOrdenados[i+1];
            if (proximo && ['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(proximo.realTipo) && proximo.uid === p.uid) {
                const horaSaida = format(new Date(proximo.dataHora), 'HH:mm');
                
                if (!diasMap[uniqueKey].s1) diasMap[uniqueKey].s1 = horaSaida;
                else diasMap[uniqueKey].s2 = horaSaida;

                if (p.descricao?.includes('Manual') || proximo.descricao?.includes('Manual')) {
                    diasMap[uniqueKey].obs = 'Ajuste Manual';
                }
                i++; 
            }
        }
    }

    const resultado = Object.values(diasMap).map((item: any) => ({
        ...item,
        dataFormatada: format(new Date(item.data), 'dd/MM/yyyy'),
        diaSemana: format(new Date(item.data), 'EEE', { locale: ptBR }).toUpperCase()
    }));

    return resultado.sort((a:any, b:any) => new Date(a.data).getTime() - new Date(b.data).getTime());
  };

  // === 2. GERADOR PDF (LAYOUT ROXO RESTAURADO) ===
  const criarDocPDF = async () => {
    const doc = new jsPDF();
    const dadosProcessados = processarDados();
    const ehRelatorioGeral = filtro.usuario === 'Todos';

    // Cabeçalho Roxo
    doc.setFillColor(124, 58, 237); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); 
    doc.text(nomeEmpresa || 'WorkID', 14, 20);
    
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); 
    doc.text('Relatório Detalhado de Frequência', 14, 28);
    
    // Info Direita
    doc.setFontSize(9); 
    doc.text('Sistema de Ponto Eletrônico', 195, 15, { align: 'right' });
    doc.text('Conformidade Portaria 671', 195, 20, { align: 'right' });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 195, 25, { align: 'right' });

    // Caixa Cinza de Filtros
    doc.setFillColor(245, 245, 245); 
    doc.rect(14, 45, 182, 25, 'F');
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    
    doc.setFont('helvetica', 'bold'); doc.text('FUNCIONÁRIO:', 18, 52); 
    doc.setFont('helvetica', 'normal'); doc.text(filtro.usuario || 'Todos', 18, 58);
    
    doc.setFont('helvetica', 'bold'); doc.text('PERÍODO:', 80, 52); 
    doc.setFont('helvetica', 'normal'); doc.text(`${format(filtro.inicio, 'dd/MM/yyyy')} até ${format(filtro.fim, 'dd/MM/yyyy')}`, 80, 58);

    // Cards de Saldo (Layout Roxo e Verde)
    if (resumoHoras && !ehRelatorioGeral) {
      // Trabalhado
      doc.setFillColor(124, 58, 237); 
      doc.roundedRect(125, 45, 35, 25, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); 
      doc.text('TRABALHADO', 142.5, 52, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); 
      doc.text(resumoHoras.total || "0h 0m", 142.5, 62, { align: 'center' });

      // Saldo
      if (resumoHoras.saldoPositivo) { doc.setFillColor(22, 163, 74); } else { doc.setFillColor(220, 38, 38); }
      doc.roundedRect(162, 45, 35, 25, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); 
      doc.text('BANCO DE HORAS', 179.5, 52, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); 
      doc.text(resumoHoras.saldo || "0h 0m", 179.5, 62, { align: 'center' });
    }

    // Tabela (Layout Antigo restaurado)
    const colunas = [
        { header: 'Data', dataKey: 'dataFormatada' },
        { header: 'Dia', dataKey: 'diaSemana' },
        { header: 'Ent.', dataKey: 'e1' }, { header: 'Sai.', dataKey: 's1' },
        { header: 'Ent.', dataKey: 'e2' }, { header: 'Sai.', dataKey: 's2' },
        { header: 'Observações', dataKey: 'obs' },
    ];
    const colStyles: any = { 0: { cellWidth: 22 }, 1: { cellWidth: 15 }, 2: { cellWidth: 12 }, 3: { cellWidth: 12 }, 4: { cellWidth: 12 }, 5: { cellWidth: 12 }, 6: { cellWidth: 'auto' } };

    autoTable(doc, {
      body: dadosProcessados,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columns: colunas,
      columnStyles: colStyles,
      didParseCell: function(data) {
        // Pinta de vermelho se for falta
        if (data.row.raw && (data.row.raw as any).isAusencia) {
            if (data.section === 'body') { 
                data.cell.styles.fillColor = [255, 240, 240]; 
                data.cell.styles.textColor = [180, 0, 0]; 
            }
        }
      }
    });

    // Assinatura (Correção Definitiva)
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 40;
    if (finalY > 250) { doc.addPage(); finalY = 40; }

    doc.setDrawColor(150, 150, 150);
    doc.line(14, finalY, 100, finalY);
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('Assinatura do Colaborador', 14, finalY + 5);

    // INSERÇÃO DA IMAGEM DA ASSINATURA
    if (assinaturaUrl) {
        try {
            // Usa a função helper para pegar o base64
            const imgData = await getBase64ImageFromURL(assinaturaUrl);
            if (imgData) {
                // Ajusta a posição para ficar EM CIMA da linha
                doc.addImage(imgData, 'PNG', 20, finalY - 25, 40, 20);
            }
        } catch (e) {
            console.error("Erro ao inserir assinatura", e);
        }
    }

    return doc;
  };

  const visualizarPDF = async () => {
    setLoading(true);
    try {
        const doc = await criarDocPDF();
        window.open(doc.output('bloburl'), '_blank');
    } catch (e) { alert('Erro ao gerar.'); }
    finally { setLoading(false); }
  };

  const baixarPDF = async () => {
    setLoading(true);
    try {
        const doc = await criarDocPDF();
        doc.save(`${nomeEmpresa}_Relatorio.pdf`);
    } catch (e) { alert('Erro ao baixar.'); }
    finally { setLoading(false); setMenuAberto(false); }
  };

  // Funções MTE e Excel (Mantidas)
  const baixarAFD = () => {
    const txtContent = gerarAFD(pontos, dadosEmpresaCompleto || { nome: nomeEmpresa, cnpj: '00000000000000' });
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `AFD.txt`; a.click(); setMenuAberto(false);
  };

  const baixarAFDT = () => {
    const txtContent = gerarAFDT(pontos, dadosEmpresaCompleto || { nome: nomeEmpresa, cnpj: '00000000000000' }, filtro.inicio, filtro.fim);
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `AFDT.txt`; a.click(); setMenuAberto(false);
  };

  const gerarExcel = () => {
    const dados = processarDados();
    const ws = XLSX.utils.json_to_sheet(dados.map((row: any) => ({
        Data: row.dataFormatada,
        Dia: row.diaSemana,
        Ent1: row.e1, Sai1: row.s1, Ent2: row.e2, Sai2: row.s2,
        Obs: row.obs
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Espelho");
    XLSX.writeFile(wb, `Espelho_${filtro.usuario}.xlsx`);
    setMenuAberto(false);
  };

  return (
    <div className="relative flex gap-2">
        <button onClick={visualizarPDF} disabled={loading} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-purple-900/20">
            <Eye size={18} /> {loading ? 'Gerando...' : 'Ver'}
        </button>

        <div className="relative">
            <button onClick={() => setMenuAberto(!menuAberto)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-green-900/20">
                <Printer size={18} /> Exportar <ChevronDown size={14} className={`transition-transform ${menuAberto ? 'rotate-180' : ''}`}/>
            </button>

            {menuAberto && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 space-y-1">
                        <button onClick={baixarPDF} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"><FileText size={16} className="text-red-400"/> PDF (Baixar)</button>
                        <button onClick={gerarExcel} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"><FileJson size={16} className="text-green-400"/> Excel (.xlsx)</button>
                        <div className="h-px bg-slate-700 my-1"></div>
                        <button onClick={baixarAFD} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"><FileCode size={16} className="text-blue-400"/> Arquivo AFD (.txt)</button>
                        <button onClick={baixarAFDT} className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"><FileCode size={16} className="text-yellow-400"/> Arquivo AFDT (.txt)</button>
                    </div>
                </div>
            )}
        </div>
        {menuAberto && <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />}
    </div>
  );
}