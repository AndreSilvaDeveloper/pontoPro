'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Eye } from 'lucide-react';
import { format, eachDayOfInterval, addDays } from 'date-fns'; // Importamos novas funções
import { ptBR } from 'date-fns/locale'; 

export default function BotaoRelatorio({ pontos, filtro, resumoHoras }: any) {
  
  const criarDocPDF = () => {
    const doc = new jsPDF();

    // === CABEÇALHO ===
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('WorkID', 14, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Espelho de Ponto Detalhado', 14, 28);
    
    doc.setFontSize(9);
    doc.text('Conformidade Portaria 671', 195, 20, { align: 'right' });

    // === DADOS ===
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    const formatarDataLocal = (dataIso: any) => {
        if (!dataIso) return '--/--/----';
        const str = dataIso instanceof Date ? dataIso.toISOString().split('T')[0] : dataIso;
        const [ano, mes, dia] = str.split('-'); 
        return `${dia}/${mes}/${ano}`;
    };

    const inicio = formatarDataLocal(filtro.inicio);
    const fim = formatarDataLocal(filtro.fim);
    const geradoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    doc.setFillColor(245, 245, 245);
    doc.rect(14, 45, 182, 25, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('FUNCIONÁRIO:', 18, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(filtro.usuario || 'Todos', 18, 58);

    doc.setFont('helvetica', 'bold');
    doc.text('PERÍODO:', 80, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`${inicio} até ${fim}`, 80, 58);

    doc.setFont('helvetica', 'bold');
    doc.text('GERADO EM:', 140, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(geradoEm, 140, 58);

    // === SALDO TOTAL ===
    if (resumoHoras) {
      doc.setFillColor(124, 58, 237);
      doc.roundedRect(140, 45, 50, 25, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('SALDO TOTAL', 165, 52, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(resumoHoras.total || "0h 0m", 165, 62, { align: 'center' });
    }

    // === LOGICA DE AGRUPAMENTO COM EXPANSÃO DE DIAS ===
    const diasAgrupados: Record<string, any> = {};
    const pontosOrdenados = [...pontos].sort((a:any, b:any) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    pontosOrdenados.forEach((p: any) => {
        
        if (p.tipo === 'AUSENCIA') {
            // Se for ausência, verifica se é um período (ex: 5 dias)
            // Precisamos das datas extras que podem vir no objeto 'extra' ou nos próprios campos se adaptou a interface
            // Vou assumir que p.extra.dataFim existe (como fizemos no Admin) ou usamos p.dataHora como inicio
            
            const dtInicio = new Date(p.dataHora);
            // Se tiver dataFim no extra, usa. Se não, assume que é só 1 dia.
            const dtFim = p.extra?.dataFim ? new Date(p.extra.dataFim) : dtInicio;

            // Gera o intervalo de dias
            try {
                const intervalo = eachDayOfInterval({ start: dtInicio, end: dtFim });

                intervalo.forEach((diaDoIntervalo) => {
                    // Ajusta fuso horário se necessário, mas aqui vamos usar string YYYY-MM-DD
                    const dataKey = format(diaDoIntervalo, 'yyyy-MM-dd');
                    
                    if (!diasAgrupados[dataKey]) {
                        diasAgrupados[dataKey] = { data: diaDoIntervalo, pontos: [], ausencia: null };
                    }
                    // Marca a ausência em TODOS os dias do intervalo
                    diasAgrupados[dataKey].ausencia = p;
                });
            } catch (e) {
                // Caso erro na data, insere só no dia original
                const dataKey = format(dtInicio, 'yyyy-MM-dd');
                if (!diasAgrupados[dataKey]) diasAgrupados[dataKey] = { data: dtInicio, pontos: [], ausencia: null };
                diasAgrupados[dataKey].ausencia = p;
            }

        } else {
            // Ponto normal
            const dataKey = format(new Date(p.dataHora), 'yyyy-MM-dd');
            if (!diasAgrupados[dataKey]) {
                diasAgrupados[dataKey] = { data: new Date(p.dataHora), pontos: [], ausencia: null };
            }
            diasAgrupados[dataKey].pontos.push(p);
        }
    });

    // Ordena as chaves (datas) para o relatório sair na ordem certa
    const chavesOrdenadas = Object.keys(diasAgrupados).sort();

    const linhas = chavesOrdenadas.map((key) => {
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

    autoTable(doc, {
      body: linhas,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
      headStyles: { 
        fillColor: [40, 40, 40], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        halign: 'center'
      },
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
        0: { cellWidth: 22 }, 
        1: { cellWidth: 18 }, 
        2: { cellWidth: 14 }, 
        3: { cellWidth: 14 },
        4: { cellWidth: 14 },
        5: { cellWidth: 14 },
        6: { cellWidth: 'auto', halign: 'left' } 
      },
      didParseCell: function(data) {
        if (data.row.raw && (data.row.raw as any).isAusencia) {
            if (data.section === 'body') {
                data.cell.styles.fillColor = [255, 240, 240];
                data.cell.styles.textColor = [180, 0, 0];
            }
        }
        const dia = (data.row.raw as any).dia;
        if ((dia === 'SÁB' || dia === 'DOM') && !(data.row.raw as any).isAusencia) {
             if (data.section === 'body') {
                data.cell.styles.fillColor = [245, 245, 245];
             }
        }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
        doc.text('WorkID - Tecnologia em Gestão de Ponto', 14, 290);
    }

    return doc;
  };

  const baixarPDF = () => { const doc = criarDocPDF(); doc.save(`WorkID_Espelho_${filtro.usuario || 'Geral'}.pdf`); };
  const visualizarPDF = () => { const doc = criarDocPDF(); window.open(doc.output('bloburl'), '_blank'); };

  return (
    <div className="flex gap-2">
      <button onClick={visualizarPDF} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center w-full md:w-auto shadow-sm transition-all"><Eye size={18} /> Ver PDF</button>
      <button onClick={baixarPDF} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center w-full md:w-auto shadow-sm transition-all"><FileDown size={18} /> Baixar</button>
    </div>
  );
}