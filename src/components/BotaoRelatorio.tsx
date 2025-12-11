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

export default function BotaoRelatorio({ pontos, filtro, resumoHoras, assinaturaUrl }: any) {
  
  // === LÓGICA INTELIGENTE DE ESCALA NOTURNA ===
  const processarDados = () => {
    const diasMap: Record<string, any> = {};
    const pontosOrdenados = [...pontos].sort((a:any, b:any) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    // 1. Processa Ausências e Faltas
    pontosOrdenados.forEach((p: any) => {
        if (p.tipo === 'AUSENCIA') {
            const dtInicio = new Date(p.dataHora);
            const dtFim = p.extra?.dataFim ? new Date(p.extra.dataFim) : dtInicio;
            try {
                const intervalo = eachDayOfInterval({ start: dtInicio, end: dtFim });
                intervalo.forEach((diaDoIntervalo) => {
                    const key = format(diaDoIntervalo, 'yyyy-MM-dd');
                    if(!diasMap[key]) diasMap[key] = { data: diaDoIntervalo, e1:'-', s1:'-', e2:'-', s2:'-', obs: '' };
                    diasMap[key].obs = `AUSÊNCIA: ${p.subTipo} (${p.descricao || ''})`;
                    diasMap[key].isAusencia = true;
                });
            } catch(e) {}
        }
    });

    // 2. Processa Pontos (Pares Inteligentes)
    for (let i = 0; i < pontosOrdenados.length; i++) {
        const p = pontosOrdenados[i];
        if (p.tipo !== 'PONTO') continue;

        // Se for Entrada, cria/usa a linha desse dia
        if (p.subTipo === 'ENTRADA' || p.subTipo === 'VOLTA_ALMOCO') {
            const key = format(new Date(p.dataHora), 'yyyy-MM-dd');
            if (!diasMap[key]) diasMap[key] = { data: new Date(p.dataHora), e1:'', s1:'', e2:'', s2:'', obs: '' };

            const horaFormatada = format(new Date(p.dataHora), 'HH:mm');
            if (p.subTipo === 'ENTRADA') diasMap[key].e1 = horaFormatada;
            else diasMap[key].e2 = horaFormatada;

            // Tenta achar o par (Saída)
            const proximo = pontosOrdenados[i+1];
            if (proximo && (proximo.subTipo === 'SAIDA' || proximo.subTipo === 'SAIDA_ALMOCO')) {
                const horaSaida = format(new Date(proximo.dataHora), 'HH:mm');
                
                // Se a saída for no dia seguinte, ela ainda entra na linha do dia 'key' (Entrada)
                if (p.subTipo === 'ENTRADA') diasMap[key].s1 = horaSaida;
                else diasMap[key].s2 = horaSaida;

                // Marca ajuste se houver
                if (p.descricao?.includes('Inclusão') || proximo.descricao?.includes('Inclusão')) {
                    diasMap[key].obs = 'Ajuste Manual';
                }

                // Consome o próximo ponto
                i++;
            }
        }
    }

    return Object.keys(diasMap).sort().map(key => ({ ...diasMap[key], data: format(diasMap[key].data, 'dd/MM/yyyy'), dia: format(diasMap[key].data, 'EEE', { locale: ptBR }).toUpperCase() }));
  };

  const criarDocPDF = async () => {
    const doc = new jsPDF();
    const dadosProcessados = processarDados();

    doc.setFillColor(124, 58, 237); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.text('WorkID', 14, 20);
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text('Espelho de Ponto Detalhado', 14, 28);
    doc.setFontSize(9); doc.text('Conformidade Portaria 671', 195, 20, { align: 'right' });

    doc.setFillColor(245, 245, 245); doc.rect(14, 45, 182, 25, 'F');
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    const formatarDataLocal = (dataIso: any) => { if (!dataIso) return '--/--/----'; const str = dataIso instanceof Date ? dataIso.toISOString().split('T')[0] : dataIso; const [ano, mes, dia] = str.split('-'); return `${dia}/${mes}/${ano}`; };
    doc.setFont('helvetica', 'bold'); doc.text('FUNCIONÁRIO:', 18, 52); doc.setFont('helvetica', 'normal'); doc.text(filtro.usuario || 'Todos', 18, 58);
    doc.setFont('helvetica', 'bold'); doc.text('PERÍODO:', 80, 52); doc.setFont('helvetica', 'normal'); doc.text(`${formatarDataLocal(filtro.inicio)} até ${formatarDataLocal(filtro.fim)}`, 80, 58);

    if (resumoHoras) {
      doc.setFillColor(124, 58, 237); doc.roundedRect(125, 45, 35, 25, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.text('TRABALHADO', 142.5, 52, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(resumoHoras.total || "0h 0m", 142.5, 62, { align: 'center' });
      if (resumoHoras.saldoPositivo) { doc.setFillColor(22, 163, 74); } else { doc.setFillColor(220, 38, 38); }
      doc.roundedRect(162, 45, 35, 25, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.text('BANCO DE HORAS', 179.5, 52, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(resumoHoras.saldo || "0h 0m", 179.5, 62, { align: 'center' });
    }

    autoTable(doc, {
      body: dadosProcessados,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columns: [{ header: 'Data', dataKey: 'data' }, { header: 'Dia', dataKey: 'dia' }, { header: 'Ent.', dataKey: 'e1' }, { header: 'Sai.', dataKey: 's1' }, { header: 'Ent.', dataKey: 'e2' }, { header: 'Sai.', dataKey: 's2' }, { header: 'Observações', dataKey: 'obs' }],
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 18 }, 2: { cellWidth: 14 }, 3: { cellWidth: 14 }, 4: { cellWidth: 14 }, 5: { cellWidth: 14 }, 6: { cellWidth: 'auto', halign: 'left' } },
      didParseCell: function(data) {
        if (data.row.raw && (data.row.raw as any).isAusencia) { if (data.section === 'body') { data.cell.styles.fillColor = [255, 240, 240]; data.cell.styles.textColor = [180, 0, 0]; } }
        const dia = (data.row.raw as any).dia;
        if ((dia === 'SÁB' || dia === 'DOM') && !(data.row.raw as any).isAusencia) { if (data.section === 'body') data.cell.styles.fillColor = [245, 245, 245]; }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 40;
    const marginLeft = 14; 

    if (assinaturaUrl && filtro.usuario !== 'Todos') {
        try {
            const imgData = await getDataUri(assinaturaUrl);
            if (imgData) { doc.addImage(imgData, 'PNG', marginLeft, finalY - 25, 50, 25); }
            doc.setDrawColor(150, 150, 150);
            doc.line(marginLeft, finalY, marginLeft + 60, finalY);
            doc.setFontSize(8); doc.setTextColor(100, 100, 100);
            doc.text('Assinatura do Colaborador', marginLeft, finalY + 5);
        } catch (e) {}
    } else if (filtro.usuario !== 'Todos') {
        doc.setDrawColor(150, 150, 150); doc.line(marginLeft, finalY, marginLeft + 60, finalY); doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text('Assinatura do Colaborador (Pendente)', marginLeft, finalY + 5);
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' }); }
    return doc;
  };

  const baixarPDF = async () => { const doc = await criarDocPDF(); doc.save(`WorkID_Espelho_${filtro.usuario || 'Geral'}.pdf`); };
  const visualizarPDF = async () => { const doc = await criarDocPDF(); window.open(doc.output('bloburl'), '_blank'); };

  const baixarCSV = () => {
    const dados = processarDados();
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    if (resumoHoras) { csvContent += `RESUMO DE HORAS\nTotal Trabalhado;${resumoHoras.total || '0h 0m'}\nBanco de Horas;${resumoHoras.saldo || '0h 0m'}\n\n`; }
    csvContent += "Data;Dia da Semana;Entrada 1;Saida 1;Entrada 2;Saida 2;Observacoes\n";
    dados.forEach(row => { const obsLimpa = row.obs.replace(/;/g, ' - '); const linha = `${row.data};${row.dia};${row.e1};${row.s1};${row.e2};${row.s2};${obsLimpa}`; csvContent += linha + "\n"; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WorkID_Dados_${filtro.usuario || 'Geral'}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="flex gap-2">
      <button onClick={visualizarPDF} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] w-full md:w-auto shadow-sm justify-center"><Eye size={18} /> Ver</button>
      <button onClick={baixarPDF} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] w-full md:w-auto shadow-sm justify-center"><FileDown size={18} /> PDF</button>
      <button onClick={baixarCSV} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] w-full md:w-auto shadow-sm justify-center border border-slate-600"><FileSpreadsheet size={18} /> Excel</button>
    </div>
  );
}