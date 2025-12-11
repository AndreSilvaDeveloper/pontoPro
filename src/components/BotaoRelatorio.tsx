'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Eye, FileSpreadsheet } from 'lucide-react';
import { format, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale'; 

const getDataUri = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = url;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (ctx) { ctx.drawImage(image, 0, 0); resolve(canvas.toDataURL('image/png')); }
        };
        image.onerror = () => resolve('');
    });
};

export default function BotaoRelatorio({ pontos, filtro, resumoHoras, assinaturaUrl, nomeEmpresa }: any) {
  
  // === LÓGICA DE PROCESSAMENTO (SUPORTE A MÚLTIPLOS FUNCIONÁRIOS) ===
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

    // ORDENAÇÃO DUPLA: PRIMEIRO POR NOME, DEPOIS POR DATA
    const pontosOrdenados = [...pontosNormalizados].sort((a:any, b:any) => {
        if (a.unome < b.unome) return -1;
        if (a.unome > b.unome) return 1;
        return a.dataObj.getTime() - b.dataObj.getTime();
    });

    // 1. Ausências
    pontosOrdenados.forEach((p: any) => {
        if (p.realTipo === 'AUSENCIA' || p.tipo === 'AUSENCIA') {
            const dtInicio = new Date(p.dataHora);
            const dtFim = p.extra?.dataFim ? new Date(p.extra.dataFim) : dtInicio;
            try {
                const intervalo = eachDayOfInterval({ start: dtInicio, end: dtFim });
                intervalo.forEach((diaDoIntervalo) => {
                    // CHAVE ÚNICA: ID_USUARIO + DATA (Para não misturar funcionários)
                    const dateKey = format(diaDoIntervalo, 'yyyy-MM-dd');
                    const uniqueKey = `${p.uid}_${dateKey}`; 
                    
                    if(!diasMap[uniqueKey]) {
                        diasMap[uniqueKey] = { 
                            data: diaDoIntervalo, 
                            nomeFunc: p.unome, // Salva o nome para exibir
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

    // 2. Pontos (Pares)
    for (let i = 0; i < pontosOrdenados.length; i++) {
        const p = pontosOrdenados[i];
        if (p.tipo === 'AUSENCIA' || p.realTipo === 'AUSENCIA') continue;

        if (['ENTRADA', 'VOLTA_ALMOCO'].includes(p.realTipo)) {
            const dateKey = format(p.dataObj, 'yyyy-MM-dd');
            const uniqueKey = `${p.uid}_${dateKey}`; // Chave composta

            if (!diasMap[uniqueKey]) {
                diasMap[uniqueKey] = { 
                    data: p.dataObj, 
                    nomeFunc: p.unome,
                    e1:'', s1:'', e2:'', s2:'', obs: '' 
                };
            }

            const horaFormatada = format(p.dataObj, 'HH:mm');
            if (p.realTipo === 'ENTRADA') diasMap[uniqueKey].e1 = horaFormatada;
            else diasMap[uniqueKey].e2 = horaFormatada;

            // Procura próximo
            const proximo = pontosOrdenados[i+1];
            
            // Verifica se existe, se é saída E SE É DO MESMO FUNCIONÁRIO
            if (proximo && ['SAIDA', 'SAIDA_ALMOCO'].includes(proximo.realTipo) && proximo.uid === p.uid) {
                const horaSaida = format(new Date(proximo.dataHora), 'HH:mm');
                
                if (p.realTipo === 'ENTRADA') diasMap[uniqueKey].s1 = horaSaida;
                else diasMap[uniqueKey].s2 = horaSaida;

                if (p.descricao?.includes('Inclusão') || proximo.descricao?.includes('Inclusão')) {
                    diasMap[uniqueKey].obs = 'Ajuste Manual';
                }
                i++;
            }
        }
    }

    // Retorna array (precisamos ordenar as chaves para manter a ordem Nome -> Data)
    // Como o objeto não garante ordem, reordenamos o resultado final
    const resultadoFinal = Object.values(diasMap).map((item: any) => ({
        ...item,
        data: format(new Date(item.data), 'dd/MM/yyyy'),
        dia: format(new Date(item.data), 'EEE', { locale: ptBR }).toUpperCase()
    }));

    return resultadoFinal.sort((a:any, b:any) => {
        if (a.nomeFunc < b.nomeFunc) return -1;
        if (a.nomeFunc > b.nomeFunc) return 1;
        // Se for mesmo nome, ordena por data (convertendo string dd/MM/yyyy de volta)
        const da = a.data.split('/').reverse().join('-');
        const db = b.data.split('/').reverse().join('-');
        return da.localeCompare(db);
    });
  };

  const criarDocPDF = async () => {
    const doc = new jsPDF();
    const dadosProcessados = processarDados();
    const ehRelatorioGeral = filtro.usuario === 'Todos';

    // Cabeçalho
    doc.setFillColor(124, 58, 237); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); 
    doc.text(nomeEmpresa || 'WorkID', 14, 20);
    
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text('Relatório Detalhado de Frequência', 14, 28);
    doc.setFontSize(9); doc.text('Sistema de Ponto Eletrônico', 195, 15, { align: 'right' });
    doc.text('Conformidade Portaria 671', 195, 20, { align: 'right' });
    const dataGeracao = format(new Date(), "dd/MM/yyyy HH:mm");
    doc.text(`Gerado em: ${dataGeracao}`, 195, 25, { align: 'right' });

    // Filtros
    doc.setFillColor(245, 245, 245); doc.rect(14, 45, 182, 25, 'F');
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    const formatarDataLocal = (dataIso: any) => { if (!dataIso) return '--/--/----'; const str = dataIso instanceof Date ? dataIso.toISOString().split('T')[0] : dataIso; const [ano, mes, dia] = str.split('-'); return `${dia}/${mes}/${ano}`; };
    
    doc.setFont('helvetica', 'bold'); doc.text('FUNCIONÁRIO:', 18, 52); 
    doc.setFont('helvetica', 'normal'); doc.text(filtro.usuario || 'Todos', 18, 58);
    
    doc.setFont('helvetica', 'bold'); doc.text('PERÍODO:', 80, 52); 
    doc.setFont('helvetica', 'normal'); doc.text(`${formatarDataLocal(filtro.inicio)} até ${formatarDataLocal(filtro.fim)}`, 80, 58);

    // Cards de Saldo (Apenas se for UM funcionário, para não somar banana com laranja)
    if (resumoHoras && !ehRelatorioGeral) {
      doc.setFillColor(124, 58, 237); doc.roundedRect(125, 45, 35, 25, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.text('TRABALHADO', 142.5, 52, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(resumoHoras.total || "0h 0m", 142.5, 62, { align: 'center' });

      if (resumoHoras.saldoPositivo) { doc.setFillColor(22, 163, 74); } else { doc.setFillColor(220, 38, 38); }
      doc.roundedRect(162, 45, 35, 25, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.text('BANCO DE HORAS', 179.5, 52, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(resumoHoras.saldo || "0h 0m", 179.5, 62, { align: 'center' });
    }

    // === DEFINIÇÃO DINÂMICA DE COLUNAS ===
    const colunas = [
        { header: 'Data', dataKey: 'data' },
        { header: 'Dia', dataKey: 'dia' },
        { header: 'Ent.', dataKey: 'e1' },
        { header: 'Sai.', dataKey: 's1' },
        { header: 'Ent.', dataKey: 'e2' },
        { header: 'Sai.', dataKey: 's2' },
        { header: 'Observações', dataKey: 'obs' },
    ];

    const colStyles: any = { 
        0: { cellWidth: 22 }, 1: { cellWidth: 15 }, 2: { cellWidth: 12 }, 
        3: { cellWidth: 12 }, 4: { cellWidth: 12 }, 5: { cellWidth: 12 }, 
        6: { cellWidth: 'auto' } 
    };

    // SE FOR TODOS, ADICIONA COLUNA DE NOME NO INÍCIO
    if (ehRelatorioGeral) {
        colunas.unshift({ header: 'Funcionário', dataKey: 'nomeFunc' });
        // Ajusta larguras para caber o nome
        colStyles[0] = { cellWidth: 35 }; // Nome
        colStyles[1] = { cellWidth: 20 }; // Data
        colStyles[2] = { cellWidth: 15 }; // Dia
        // ... As horas ficam iguais
    }

    autoTable(doc, {
      body: dadosProcessados,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columns: colunas,
      columnStyles: colStyles,
      didParseCell: function(data) {
        if (data.row.raw && (data.row.raw as any).isAusencia) {
            if (data.section === 'body') { data.cell.styles.fillColor = [255, 240, 240]; data.cell.styles.textColor = [180, 0, 0]; }
        }
        const dia = (data.row.raw as any).dia;
        if ((dia === 'SÁB' || dia === 'DOM') && !(data.row.raw as any).isAusencia) {
             if (data.section === 'body') data.cell.styles.fillColor = [245, 245, 245];
        }
      }
    });

    // Assinatura (Somente se for individual)
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    const marginLeft = 14; 

    if (!ehRelatorioGeral) {
        doc.setDrawColor(150, 150, 150);
        doc.line(marginLeft, finalY, marginLeft + 60, finalY);
        doc.setFontSize(8); doc.setTextColor(100, 100, 100);
        doc.text('Assinatura do Colaborador', marginLeft, finalY + 5);

        if (assinaturaUrl) {
            try {
                const imgData = await getDataUri(assinaturaUrl);
                if (imgData) { doc.addImage(imgData, 'PNG', marginLeft + 5, finalY - 25, 40, 20); }
            } catch (e) {}
        }
    } else {
        // Relatório Geral
        doc.text('Relatório Consolidado - Conferência do Gestor', marginLeft, finalY);
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' }); }
    return doc;
  };

  const baixarPDF = async () => { const doc = await criarDocPDF(); doc.save(`${nomeEmpresa || 'WorkID'}_Relatorio.pdf`); };
  const visualizarPDF = async () => { const doc = await criarDocPDF(); window.open(doc.output('bloburl'), '_blank'); };
  
  const baixarCSV = () => {
    const dados = processarDados();
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += `EMPRESA;${nomeEmpresa || 'WorkID'}\n`;
    if (resumoHoras && filtro.usuario !== 'Todos') { csvContent += `RESUMO\nTotal;${resumoHoras.total}\nBanco;${resumoHoras.saldo}\n\n`; }
    
    // Cabeçalho CSV dinâmico
    if (filtro.usuario === 'Todos') csvContent += "Funcionario;";
    csvContent += "Data;Dia;Entrada;Saida;Entrada;Saida;Obs\n";

    dados.forEach(row => { 
        if (filtro.usuario === 'Todos') csvContent += `${row.nomeFunc};`;
        csvContent += `${row.data};${row.dia};${row.e1};${row.s1};${row.e2};${row.s2};${row.obs}\n`; 
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `${nomeEmpresa || 'WorkID'}_dados.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="flex gap-2">
      <button onClick={visualizarPDF} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center"><Eye size={18} /> Ver</button>
      <button onClick={baixarPDF} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center"><FileDown size={18} /> PDF</button>
      <button onClick={baixarCSV} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center border border-slate-600"><FileSpreadsheet size={18} /> Excel</button>
    </div>
  );
}