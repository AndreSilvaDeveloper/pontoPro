'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
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

  // === 1. LÓGICA DE PROCESSAMENTO ===
  const processarDados = () => {
    const diasMap: Record<string, any> = {};
    const diasSemanaAbrev = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']; 
    
    const pontosNormalizados = pontos.map((p: any) => ({
        ...p,
        realTipo: p.tipo === 'PONTO' ? p.subTipo : p.tipo,
        dataObj: new Date(p.dataHora),
        uid: p.usuario?.id || 'desc',
        unome: p.usuario?.nome || 'Desconhecido'
    }));

    pontosNormalizados.forEach((p: any) => {
        const dateKey = format(p.dataObj, 'yyyy-MM-dd');
        // Usa timestamp na chave para garantir unicidade em casos de múltiplas ausências distintas
        const uniqueKey = `${p.uid}_${dateKey}_${p.id}`; 

        const hora = format(p.dataObj, 'HH:mm');

        // === ALTERAÇÃO AQUI: LÓGICA DE AUSÊNCIA AGRUPADA ===
        if (p.realTipo === 'AUSENCIA' || p.tipo === 'AUSENCIA') {
            const dtInicio = new Date(p.dataHora);
            const dtFim = p.extra?.dataFim ? new Date(p.extra.dataFim) : dtInicio;
            
            // Verifica se é um intervalo ou dia único
            const ehIntervalo = !isSameDay(dtInicio, dtFim);
            
            // Cria a string de data (Única ou Range)
            let dataFormatadaDisplay = format(dtInicio, 'dd/MM/yyyy');
            if (ehIntervalo) {
                dataFormatadaDisplay += ` a ${format(dtFim, 'dd/MM/yyyy')}`;
            }

            // Não fazemos mais o loop 'eachDayOfInterval'. Criamos apenas UM registro.
            if(!diasMap[uniqueKey]) {
                diasMap[uniqueKey] = { 
                    data: dtInicio, // Usa data de início para ordenação
                    nomeFunc: p.unome, 
                    batidas: [], 
                    obsArray: [], 
                    isAusencia: true,
                    customDataDisplay: dataFormatadaDisplay // Campo novo para exibir o range
                };
            }
            diasMap[uniqueKey].obsArray.push(`AUSÊNCIA: ${p.descricao || 'Sem motivo'}`);
        } 
        // LÓGICA DE PONTOS NORMAIS (MANTIDA)
        else {
            // Para pontos normais, usamos a chave padrão dia_usuario para agrupar batidas do mesmo dia
            const keyDiaNormal = `${p.uid}_${dateKey}`;
            
            if (!diasMap[keyDiaNormal]) {
                diasMap[keyDiaNormal] = {
                    data: p.dataObj,
                    nomeFunc: p.unome, 
                    batidas: [], 
                    obsArray: [], 
                    isAusencia: false
                };
            }

            const tiposValidos = ['ENTRADA', 'SAIDA', 'SAIDA_ALMOCO', 'VOLTA_ALMOCO', 'SAIDA_INTERVALO', 'VOLTA_INTERVALO', 'PONTO'];
            if (tiposValidos.includes(p.realTipo)) {
                diasMap[keyDiaNormal].batidas.push(hora);
                if (p.descricao && p.descricao !== 'Manual' && !p.descricao.includes('GPS')) {
                    diasMap[keyDiaNormal].obsArray.push(p.descricao);
                }
            }
        }
    });

    const resultado = Object.values(diasMap).map((item: any) => {
        const b = item.batidas.sort(); 
        const obsUnicas = [...new Set(item.obsArray)].join('; ');
        
        const diaIndex = getDay(new Date(item.data));
        const diaSemanaFixo = diasSemanaAbrev[diaIndex];

        return {
            nomeFunc: item.nomeFunc, 
            data: item.data,
            // Se tiver o customDataDisplay (Range de férias), usa ele. Se não, usa a data normal.
            dataFormatada: item.customDataDisplay || format(new Date(item.data), 'dd/MM/yyyy'),
            diaSemana: diaSemanaFixo,
            
            e1: b[0] || '-', s1: b[1] || '-',
            e2: b[2] || '-', s2: b[3] || '-',
            e3: b[4] || '-', s3: b[5] || '-',
            
            obs: (b.length > 6 ? `+${b.length - 6} batidas. ` : '') + (item.isAusencia ? (obsUnicas || 'Ausência') : obsUnicas),
            isAusencia: item.isAusencia,
            trabalhou: b.length > 0 && !item.isAusencia
        };
    });

    return resultado.sort((a:any, b:any) => {
        if (a.nomeFunc < b.nomeFunc) return -1;
        if (a.nomeFunc > b.nomeFunc) return 1;
        return new Date(a.data).getTime() - new Date(b.data).getTime();
    });
  };

  // === 2. GERADOR PDF ATUALIZADO ===
  const criarDocPDF = async () => {
    const doc = new jsPDF();
    const dadosProcessados = processarDados();
    const ehRelatorioGeral = filtro.usuario === 'Todos' || !filtro.usuario || filtro.usuario === 'Todos os Funcionários';
    const diasTrabalhados = dadosProcessados.filter((d: any) => d.trabalhou).length;
    const ehPeriodo = !isSameDay(filtro.inicio, filtro.fim);

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

    // === BARRA CINZA ===
    doc.setFillColor(245, 245, 245); 
    doc.rect(14, 45, 182, 25, 'F');
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    
    // FUNCIONÁRIO
    doc.setFont('helvetica', 'bold'); doc.text('FUNCIONÁRIO:', 18, 52); 
    doc.setFont('helvetica', 'normal'); 
    let nomeFuncionario = ehRelatorioGeral ? 'TODOS OS COLABORADORES' : filtro.usuario;
    if (nomeFuncionario.length > 22) nomeFuncionario = nomeFuncionario.substring(0, 22) + '...';
    doc.text(nomeFuncionario, 18, 58);
    
    // PERÍODO
    const xPeriodo = 72; 
    doc.setFont('helvetica', 'bold'); doc.text('PERÍODO:', xPeriodo, 52); 
    doc.setFont('helvetica', 'normal'); 
    doc.text(`${format(filtro.inicio, 'dd/MM/yyyy')} até ${format(filtro.fim, 'dd/MM/yyyy')}`, xPeriodo, 58);

    // === CARDS ===
    if (resumoHoras && !ehRelatorioGeral) {
      const cardY = 45;
      const cardHeight = 25;
      const cardWidth = 24; 
      const endX = 196; 
      
      const xCard3 = endX - cardWidth; // Banco
      const xCard2 = xCard3 - cardWidth - 2; // Horas
      const xCard1 = xCard2 - cardWidth - 2; // Dias

      if (ehPeriodo) {
          doc.setFillColor(59, 130, 246); 
          doc.roundedRect(xCard1, cardY, cardWidth, cardHeight, 2, 2, 'F');
          doc.setTextColor(255, 255, 255); 
          doc.setFontSize(6); doc.text('DIAS TRAB.', xCard1 + (cardWidth/2), cardY + 7, { align: 'center' });
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); 
          doc.text(String(diasTrabalhados), xCard1 + (cardWidth/2), cardY + 17, { align: 'center' });
      }

      // HORAS
      doc.setFillColor(124, 58, 237); 
      const posHorasFinal = ehPeriodo ? xCard2 : xCard3 - cardWidth - 2;
      doc.roundedRect(posHorasFinal, cardY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); 
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text('TOTAL HORAS', posHorasFinal + (cardWidth/2), cardY + 7, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); 
      doc.text(resumoHoras.total || "0h", posHorasFinal + (cardWidth/2), cardY + 17, { align: 'center' });

      // BANCO
      if (resumoHoras.saldoPositivo) { doc.setFillColor(22, 163, 74); } else { doc.setFillColor(220, 38, 38); }
      const posBancoFinal = xCard3;
      doc.roundedRect(posBancoFinal, cardY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); 
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text('BANCO', posBancoFinal + (cardWidth/2), cardY + 7, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); 
      doc.text(resumoHoras.saldo || "0h", posBancoFinal + (cardWidth/2), cardY + 17, { align: 'center' });
    }

    let colunas = [];
    let colStyles = {};

    // === DEFINIÇÃO DAS COLUNAS (AJUSTE LARGURA DATA) ===
    // Aumentei a largura da coluna Data para caber "01/01/2026 a 30/01/2026"
    if (ehRelatorioGeral) {
        colunas = [
            { header: 'Nome', dataKey: 'nomeFunc' },
            { header: 'Data', dataKey: 'dataFormatada' },
            { header: 'Dia', dataKey: 'diaSemana' },
            { header: 'E1', dataKey: 'e1' }, { header: 'S1', dataKey: 's1' },
            { header: 'E2', dataKey: 'e2' }, { header: 'S2', dataKey: 's2' },
            { header: 'E3', dataKey: 'e3' }, { header: 'S3', dataKey: 's3' }, 
            { header: 'Obs', dataKey: 'obs' },
        ];
        colStyles = { 
            0: { cellWidth: 25, fontStyle: 'bold' }, // Reduzi um pouco o nome
            1: { cellWidth: 35 }, // AUMENTADO PARA CABER RANGE
            2: { cellWidth: 10 }, 
            3: { cellWidth: 9 }, 4: { cellWidth: 9 }, 
            5: { cellWidth: 9 }, 6: { cellWidth: 9 }, 
            7: { cellWidth: 9 }, 8: { cellWidth: 9 }, 
            9: { cellWidth: 'auto' } 
        };
    } else {
        colunas = [
            { header: 'Data', dataKey: 'dataFormatada' },
            { header: 'Dia', dataKey: 'diaSemana' },
            { header: 'Ent.', dataKey: 'e1' }, { header: 'Sai.', dataKey: 's1' },
            { header: 'Ent.', dataKey: 'e2' }, { header: 'Sai.', dataKey: 's2' },
            { header: 'Ent.', dataKey: 'e3' }, { header: 'Sai.', dataKey: 's3' }, 
            { header: 'Observações', dataKey: 'obs' },
        ];
        colStyles = { 
            0: { cellWidth: 35 }, // AUMENTADO PARA CABER RANGE
            1: { cellWidth: 15 }, 
            2: { cellWidth: 10 }, 3: { cellWidth: 10 },
            4: { cellWidth: 10 }, 5: { cellWidth: 10 },
            6: { cellWidth: 10 }, 7: { cellWidth: 10 },
            8: { cellWidth: 'auto' }
        };
    }

    autoTable(doc, {
      body: dadosProcessados,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, valign: 'middle', halign: 'center' },
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

    if (!ehRelatorioGeral) {
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
                if (imgData) doc.addImage(imgData, 'PNG', 20, finalY - 25, 40, 20);
            } catch (e) { console.error(e); }
        }
    }

    return doc;
  };

  const visualizarPDF = async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let janela: Window | null = null;

    if (!isMobile) {
        janela = window.open('', '_blank');
        if (janela) {
            janela.document.write(`
                <html>
                    <head><title>Gerando...</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#1e1e1e;color:#fff;font-family:sans-serif;">
                        <div style="text-align:center">
                            <h3>Gerando Relatório...</h3>
                            <p style="opacity:0.7">Aguarde um momento.</p>
                        </div>
                    </body>
                </html>
            `);
        }
    }

    setLoading(true);
    try {
        const doc = await criarDocPDF();

        if (isMobile) {
            doc.save(`${nomeEmpresa}_Relatorio.pdf`);
            setTimeout(() => alert("Relatório baixado com sucesso! Verifique suas notificações ou pasta de downloads."), 500);
        } else {
            const blobUrl = doc.output('bloburl');
            const blobUrlStr = String(blobUrl);
            if (janela) {
                janela.location.href = blobUrlStr;
            } else {
                window.open(blobUrlStr, '_blank');
            }
        }
    } catch (e) { 
        if (janela) janela.close();
        console.error(e);
        alert('Erro ao gerar relatório.'); 
    } finally { 
        setLoading(false); 
    }
  };

  const baixarPDF = async () => {
    setLoading(true);
    try {
        const doc = await criarDocPDF();
        doc.save(`${nomeEmpresa}_Relatorio.pdf`);
    } catch (e) { alert('Erro ao baixar.'); }
    finally { setLoading(false); setMenuAberto(false); }
  };

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
        Funcionario: row.nomeFunc, 
        Data: row.dataFormatada,
        Dia: row.diaSemana,
        Ent1: row.e1, Sai1: row.s1, 
        Ent2: row.e2, Sai2: row.s2,
        Ent3: row.e3, Sai3: row.s3,
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