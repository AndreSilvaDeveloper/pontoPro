'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale'; 
import { Download, FileText, FileJson, ChevronDown, FileCode, Printer, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { gerarAFD, gerarAFDT } from '@/utils/geradorMTE'; 

// === HELPER: Converter Imagem URL para Base64 ===
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

  // === 1. NOVA LÓGICA (SEQUENCIAL PARA 6 BATIDAS) ===
  const processarDados = () => {
    const diasMap: Record<string, any> = {};
    
    // 1. Normaliza os dados
    const pontosNormalizados = pontos.map((p: any) => ({
        ...p,
        realTipo: p.tipo === 'PONTO' ? p.subTipo : p.tipo,
        dataObj: new Date(p.dataHora),
        uid: p.usuario?.id || 'desc',
        unome: p.usuario?.nome || 'Desconhecido'
    }));

    // 2. Agrupa tudo por Dia + Usuário
    pontosNormalizados.forEach((p: any) => {
        const dateKey = format(p.dataObj, 'yyyy-MM-dd');
        const uniqueKey = `${p.uid}_${dateKey}`;

        // Cria a entrada do dia se não existir
        if (!diasMap[uniqueKey]) {
            diasMap[uniqueKey] = {
                data: p.dataObj,
                nomeFunc: p.unome,
                batidas: [], // Lista temporária para ordenar horários
                obsArray: [], // Lista de observações
                isAusencia: false
            };
        }

        // Se for Ausência
        if (p.realTipo === 'AUSENCIA' || p.tipo === 'AUSENCIA') {
            const dtInicio = new Date(p.dataHora);
            const dtFim = p.extra?.dataFim ? new Date(p.extra.dataFim) : dtInicio;
            
            // Marca o dia atual e possíveis dias seguintes (se for período)
            try {
                const intervalo = eachDayOfInterval({ start: dtInicio, end: dtFim });
                intervalo.forEach((diaDoIntervalo) => {
                    const dKey = format(diaDoIntervalo, 'yyyy-MM-dd');
                    const uKey = `${p.uid}_${dKey}`;
                    
                    if(!diasMap[uKey]) {
                        diasMap[uKey] = { 
                            data: diaDoIntervalo, 
                            nomeFunc: p.unome,
                            batidas: [], 
                            obsArray: [],
                            isAusencia: true 
                        };
                    }
                    const motivo = p.descricao || p.motivo || 'Sem motivo';
                    diasMap[uKey].obsArray.push(`AUSÊNCIA: ${motivo}`);
                    diasMap[uKey].isAusencia = true;
                });
            } catch(e) {}
        } 
        // Se for Ponto Normal (Entrada, Saída, Intervalos...)
        else if (['ENTRADA', 'SAIDA', 'SAIDA_ALMOCO', 'VOLTA_ALMOCO', 'SAIDA_INTERVALO', 'VOLTA_INTERVALO', 'PONTO'].includes(p.realTipo)) {
            const horaFormatada = format(p.dataObj, 'HH:mm');
            diasMap[uniqueKey].batidas.push(horaFormatada);
            
            if (p.descricao && p.descricao !== 'Manual' && !p.descricao.includes('GPS')) {
                diasMap[uniqueKey].obsArray.push(p.descricao);
            }
        }
    });

    // 3. Transforma o Map em Array formatado para a Tabela
    const resultado = Object.values(diasMap).map((item: any) => {
        // Ordena as batidas cronologicamente
        const batidasOrdenadas = item.batidas.sort();
        
        // Remove duplicatas de observação
        const obsUnicas = [...new Set(item.obsArray)].join('; ');

        return {
            data: item.data,
            nomeFunc: item.nomeFunc,
            dataFormatada: format(new Date(item.data), 'dd/MM/yyyy'),
            diaSemana: format(new Date(item.data), 'EEE', { locale: ptBR }).toUpperCase(),
            
            // Mapeia sequencialmente para as 6 colunas
            e1: batidasOrdenadas[0] || '-',
            s1: batidasOrdenadas[1] || '-',
            e2: batidasOrdenadas[2] || '-',
            s2: batidasOrdenadas[3] || '-',
            e3: batidasOrdenadas[4] || '-', // Extra 1 (Volta Intervalo)
            s3: batidasOrdenadas[5] || '-', // Extra 2 (Saída Final)
            
            obs: item.isAusencia ? (obsUnicas || 'Ausência Registrada') : obsUnicas,
            isAusencia: item.isAusencia
        };
    });

    // Ordena o array final por data
    return resultado.sort((a:any, b:any) => new Date(a.data).getTime() - new Date(b.data).getTime());
  };

  // === 2. GERADOR PDF ATUALIZADO (6 COLUNAS) ===
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

    // Filtros
    doc.setFillColor(245, 245, 245); 
    doc.rect(14, 45, 182, 25, 'F');
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    
    doc.setFont('helvetica', 'bold'); doc.text('FUNCIONÁRIO:', 18, 52); 
    doc.setFont('helvetica', 'normal'); doc.text(filtro.usuario || 'Todos', 18, 58);
    
    doc.setFont('helvetica', 'bold'); doc.text('PERÍODO:', 80, 52); 
    doc.setFont('helvetica', 'normal'); doc.text(`${format(filtro.inicio, 'dd/MM/yyyy')} até ${format(filtro.fim, 'dd/MM/yyyy')}`, 80, 58);

    // Cards Saldo
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

    // === DEFINIÇÃO DAS 6 COLUNAS ===
    const colunas = [
        { header: 'Data', dataKey: 'dataFormatada' },
        { header: 'Dia', dataKey: 'diaSemana' },
        { header: 'Ent.', dataKey: 'e1' }, { header: 'Sai.', dataKey: 's1' },
        { header: 'Ent.', dataKey: 'e2' }, { header: 'Sai.', dataKey: 's2' },
        { header: 'Ent.', dataKey: 'e3' }, { header: 'Sai.', dataKey: 's3' }, // Novas Colunas
        { header: 'Observações', dataKey: 'obs' },
    ];

    // Ajuste de largura para caber tudo na folha A4
    const colStyles: any = { 
        0: { cellWidth: 20 }, // Data
        1: { cellWidth: 12 }, // Dia
        2: { cellWidth: 11 }, // E1
        3: { cellWidth: 11 }, // S1
        4: { cellWidth: 11 }, // E2
        5: { cellWidth: 11 }, // S2
        6: { cellWidth: 11 }, // E3 (Novo)
        7: { cellWidth: 11 }, // S3 (Novo)
        8: { cellWidth: 'auto' } // Obs (Restante)
    };

    autoTable(doc, {
      body: dadosProcessados,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle', halign: 'center' }, // Fonte um pouco menor para caber
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columns: colunas,
      columnStyles: colStyles,
      didParseCell: function(data) {
        if (data.row.raw && (data.row.raw as any).isAusencia) {
            if (data.section === 'body') { 
                data.cell.styles.fillColor = [255, 240, 240]; 
                data.cell.styles.textColor = [180, 0, 0]; 
            }
        }
      }
    });

    // Assinatura
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 40;
    if (finalY > 250) { doc.addPage(); finalY = 40; }

    doc.setDrawColor(150, 150, 150);
    doc.line(14, finalY, 100, finalY);
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('Assinatura do Colaborador', 14, finalY + 5);

    if (assinaturaUrl) {
        try {
            const imgData = await getBase64ImageFromURL(assinaturaUrl);
            if (imgData) {
                doc.addImage(imgData, 'PNG', 20, finalY - 25, 40, 20);
            }
        } catch (e) { console.error(e); }
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

  // Funções MTE mantidas (elas já aceitam lista crua de pontos)
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

  // === 3. EXCEL ATUALIZADO (6 COLUNAS) ===
  const gerarExcel = () => {
    const dados = processarDados();
    const ws = XLSX.utils.json_to_sheet(dados.map((row: any) => ({
        Data: row.dataFormatada,
        Dia: row.diaSemana,
        Ent1: row.e1, Sai1: row.s1, 
        Ent2: row.e2, Sai2: row.s2,
        Ent3: row.e3, Sai3: row.s3, // Novas Colunas
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