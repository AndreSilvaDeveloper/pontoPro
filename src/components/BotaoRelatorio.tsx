'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Eye, FileSpreadsheet } from 'lucide-react';
import { format, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale'; 

export default function BotaoRelatorio({ pontos, filtro, resumoHoras }: any) {
  
  // === LÓGICA DE AGRUPAMENTO ===
  const processarDados = () => {
    const diasAgrupados: Record<string, any> = {};
    const pontosOrdenados = [...pontos].sort((a:any, b:any) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    pontosOrdenados.forEach((p: any) => {
        if (p.tipo === 'AUSENCIA') {
            const dtInicio = new Date(p.dataHora);
            const dtFim = p.extra?.dataFim ? new Date(p.extra.dataFim) : dtInicio;

            try {
                const intervalo = eachDayOfInterval({ start: dtInicio, end: dtFim });
                intervalo.forEach((diaDoIntervalo) => {
                    const dataKey = format(diaDoIntervalo, 'yyyy-MM-dd');
                    if (!diasAgrupados[dataKey]) {
                        diasAgrupados[dataKey] = { data: diaDoIntervalo, pontos: [], ausencia: null };
                    }
                    diasAgrupados[dataKey].ausencia = p;
                });
            } catch (e) {
                const dataKey = format(dtInicio, 'yyyy-MM-dd');
                if (!diasAgrupados[dataKey]) diasAgrupados[dataKey] = { data: dtInicio, pontos: [], ausencia: null };
                diasAgrupados[dataKey].ausencia = p;
            }
        } else {
            const dataKey = format(new Date(p.dataHora), 'yyyy-MM-dd');
            if (!diasAgrupados[dataKey]) {
                diasAgrupados[dataKey] = { data: new Date(p.dataHora), pontos: [], ausencia: null };
            }
            diasAgrupados[dataKey].pontos.push(p);
        }
    });

    const chavesOrdenadas = Object.keys(diasAgrupados).sort();

    return chavesOrdenadas.map((key) => {
        const dia = diasAgrupados[key];
        const dataFormatada = format(dia.data, 'dd/MM/yyyy');
        const diaSemana = format(dia.data, 'EEE', { locale: ptBR }).toUpperCase();

        if (dia.ausencia) {
            return {
                data: dataFormatada,
                dia: diaSemana,
                e1: '-', s1: '-', e2: '-', s2: '-',
                obs: `AUSÊNCIA: ${dia.ausencia.subTipo} (${dia.ausencia.descricao || 'S/ Motivo'})`,
                isAusencia: true
            };
        }

        const pEntrada = dia.pontos.find((p: any) => p.subTipo === 'ENTRADA');
        const pSaidaAlmoco = dia.pontos.find((p: any) => p.subTipo === 'SAIDA_ALMOCO');
        const pVoltaAlmoco = dia.pontos.find((p: any) => p.subTipo === 'VOLTA_ALMOCO');
        const pSaida = dia.pontos.find((p: any) => p.subTipo === 'SAIDA');
        const temAjuste = dia.pontos.some((p: any) => p.descricao && p.descricao.includes('Inclusão'));

        return {
            data: dataFormatada,
            dia: diaSemana,
            e1: pEntrada ? format(new Date(pEntrada.dataHora), 'HH:mm') : '',
            s1: pSaidaAlmoco ? format(new Date(pSaidaAlmoco.dataHora), 'HH:mm') : '',
            e2: pVoltaAlmoco ? format(new Date(pVoltaAlmoco.dataHora), 'HH:mm') : '',
            s2: pSaida ? format(new Date(pSaida.dataHora), 'HH:mm') : '',
            obs: temAjuste ? 'Ajuste Manual' : '',
            isAusencia: false
        };
    });
  };

  // === GERADOR DE PDF ===
  const criarDocPDF = () => {
    const doc = new jsPDF();
    const dadosProcessados = processarDados();

    // Cabeçalho Roxo
    doc.setFillColor(124, 58, 237); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.text('WorkID', 14, 20);
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text('Espelho de Ponto Detalhado', 14, 28);
    doc.setFontSize(9); doc.text('Conformidade Portaria 671', 195, 20, { align: 'right' });

    // Fundo Cinza dos Dados
    doc.setFillColor(245, 245, 245); doc.rect(14, 45, 182, 25, 'F');

    // Textos do Filtro
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    const formatarDataLocal = (dataIso: any) => {
        if (!dataIso) return '--/--/----';
        const str = dataIso instanceof Date ? dataIso.toISOString().split('T')[0] : dataIso;
        const [ano, mes, dia] = str.split('-'); 
        return `${dia}/${mes}/${ano}`;
    };

    doc.setFont('helvetica', 'bold'); doc.text('FUNCIONÁRIO:', 18, 52);
    doc.setFont('helvetica', 'normal'); doc.text(filtro.usuario || 'Todos', 18, 58);

    doc.setFont('helvetica', 'bold'); doc.text('PERÍODO:', 80, 52);
    doc.setFont('helvetica', 'normal'); doc.text(`${formatarDataLocal(filtro.inicio)} até ${formatarDataLocal(filtro.fim)}`, 80, 58);

    // === NOVOS CARDS DE SALDO NO PDF ===
    if (resumoHoras) {
      // 1. CARD ROXO: TOTAL TRABALHADO
      doc.setFillColor(124, 58, 237); // Roxo
      doc.roundedRect(125, 45, 35, 25, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('TRABALHADO', 142.5, 52, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(resumoHoras.total || "0h 0m", 142.5, 62, { align: 'center' });

      // 2. CARD COLORIDO: BANCO DE HORAS
      // Escolhe a cor baseada no saldoPositivo
      if (resumoHoras.saldoPositivo) {
         doc.setFillColor(22, 163, 74); // Verde (green-600)
      } else {
         doc.setFillColor(220, 38, 38); // Vermelho (red-600)
      }
      doc.roundedRect(162, 45, 35, 25, 2, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text('BANCO DE HORAS', 179.5, 52, { align: 'center' });
      
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      
      // Usa o campo 'saldo' que criamos na lógica de estatísticas
      const textoSaldo = resumoHoras.saldo ? resumoHoras.saldo : "0h 0m";
      doc.text(textoSaldo, 179.5, 62, { align: 'center' });
    }

    // Tabela
    autoTable(doc, {
      body: dadosProcessados,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columns: [
        { header: 'Data', dataKey: 'data' },
        { header: 'Dia', dataKey: 'dia' },
        { header: 'Ent.', dataKey: 'e1' },
        { header: 'Sai.', dataKey: 's1' },
        { header: 'Ent.', dataKey: 'e2' },
        { header: 'Sai.', dataKey: 's2' },
        { header: 'Observações', dataKey: 'obs' },
      ],
      columnStyles: {
        0: { cellWidth: 22 }, 1: { cellWidth: 18 }, 2: { cellWidth: 14 }, 3: { cellWidth: 14 },
        4: { cellWidth: 14 }, 5: { cellWidth: 14 }, 6: { cellWidth: 'auto', halign: 'left' } 
      },
      didParseCell: function(data) {
        if (data.row.raw && (data.row.raw as any).isAusencia) {
            if (data.section === 'body') {
                data.cell.styles.fillColor = [255, 240, 240]; data.cell.styles.textColor = [180, 0, 0];
            }
        }
        const dia = (data.row.raw as any).dia;
        if ((dia === 'SÁB' || dia === 'DOM') && !(data.row.raw as any).isAusencia) {
             if (data.section === 'body') data.cell.styles.fillColor = [245, 245, 245];
        }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
        doc.text('WorkID - Tecnologia em Gestão de Ponto', 14, 290);
    }
    return doc;
  };

  const baixarPDF = () => { const doc = criarDocPDF(); doc.save(`WorkID_Espelho_${filtro.usuario || 'Geral'}.pdf`); };
  const visualizarPDF = () => { const doc = criarDocPDF(); window.open(doc.output('bloburl'), '_blank'); };

  // === GERADOR DE EXCEL (Com Saldo) ===
  const baixarCSV = () => {
    const dados = processarDados();
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    // Cabeçalho com Resumo
    if (resumoHoras) {
        csvContent += `RESUMO DE HORAS\n`;
        csvContent += `Total Trabalhado;${resumoHoras.total || '0h 0m'}\n`;
        csvContent += `Banco de Horas;${resumoHoras.saldo || '0h 0m'}\n\n`;
    }

    csvContent += "Data;Dia da Semana;Entrada 1;Saida 1;Entrada 2;Saida 2;Observacoes\n";

    dados.forEach(row => {
        const obsLimpa = row.obs.replace(/;/g, ' - ');
        const linha = `${row.data};${row.dia};${row.e1};${row.s1};${row.e2};${row.s2};${obsLimpa}`;
        csvContent += linha + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WorkID_Dados_${filtro.usuario || 'Geral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex gap-2">
      <button onClick={visualizarPDF} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center w-full md:w-auto shadow-sm transition-all" title="Visualizar PDF"><Eye size={18} /> Ver</button>
      <button onClick={baixarPDF} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center w-full md:w-auto shadow-sm transition-all" title="Baixar PDF"><FileDown size={18} /> PDF</button>
      <button onClick={baixarCSV} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center w-full md:w-auto shadow-sm transition-all border border-slate-600" title="Exportar para Excel"><FileSpreadsheet size={18} /> Excel</button>
    </div>
  );
}