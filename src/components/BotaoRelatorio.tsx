'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, eachDayOfInterval, isSameDay, getDay } from 'date-fns'; // Adicionei getDay
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
    const diasSemanaAbrev = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']; // Abreviação Manual Blindada
    
    const pontosNormalizados = pontos.map((p: any) => ({
        ...p,
        realTipo: p.tipo === 'PONTO' ? p.subTipo : p.tipo,
        dataObj: new Date(p.dataHora),
        uid: p.usuario?.id || 'desc',
        unome: p.usuario?.nome || 'Desconhecido'
    }));

    pontosNormalizados.forEach((p: any) => {
        const dateKey = format(p.dataObj, 'yyyy-MM-dd');
        const uniqueKey = `${p.uid}_${dateKey}`; 

        if (!diasMap[uniqueKey]) {
            diasMap[uniqueKey] = {
                data: p.dataObj,
                nomeFunc: p.unome, 
                batidas: [], 
                obsArray: [], 
                isAusencia: false
            };
        }

        const hora = format(p.dataObj, 'HH:mm');

        if (p.realTipo === 'AUSENCIA' || p.tipo === 'AUSENCIA') {
            const dtInicio = new Date(p.dataHora);
            const dtFim = p.extra?.dataFim ? new Date(p.extra.dataFim) : dtInicio;
            try {
                eachDayOfInterval({ start: dtInicio, end: dtFim }).forEach((dia) => {
                    const uKey = `${p.uid}_${format(dia, 'yyyy-MM-dd')}`;
                    if(!diasMap[uKey]) {
                        diasMap[uKey] = { 
                            data: dia, nomeFunc: p.unome, batidas: [], obsArray: [], isAusencia: true 
                        };
                    }
                    diasMap[uKey].obsArray.push(`AUSÊNCIA: ${p.descricao || 'Sem motivo'}`);
                    diasMap[uKey].isAusencia = true;
                });
            } catch(e) {}
        } 
        else if (p.realTipo === 'SAIDA_INTERVALO' || p.realTipo === 'VOLTA_INTERVALO') {
            const label = p.realTipo === 'SAIDA_INTERVALO' ? 'Café Ida' : 'Café Volta';
            diasMap[uniqueKey].obsArray.push(`${label}: ${hora}`);
        }
        else if (['ENTRADA', 'SAIDA', 'SAIDA_ALMOCO', 'VOLTA_ALMOCO', 'PONTO'].includes(p.realTipo)) {
            diasMap[uniqueKey].batidas.push(hora);
            if (p.descricao && p.descricao !== 'Manual' && !p.descricao.includes('GPS')) {
                diasMap[uniqueKey].obsArray.push(p.descricao);
            }
        }
    });

    const resultado = Object.values(diasMap).map((item: any) => {
        const b = item.batidas.sort(); 
        const obsUnicas = [...new Set(item.obsArray)].join('; ');
        
        // CORREÇÃO: Usa o array manual para garantir 3 letras e evitar quebras
        const diaIndex = getDay(new Date(item.data));
        const diaSemanaFixo = diasSemanaAbrev[diaIndex];

        return {
            nomeFunc: item.nomeFunc, 
            data: item.data,
            dataFormatada: format(new Date(item.data), 'dd/MM/yyyy'),
            diaSemana: diaSemanaFixo, // "SEG", "TER"...
            
            e1: b[0] || '-',
            s1: b[1] || '-',
            e2: b[2] || '-',
            s2: b[3] || '-',
            extra: b.length > 4 ? `+${b.length - 4} batidas` : '',
            
            obs: item.isAusencia ? (obsUnicas || 'Ausência') : obsUnicas,
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
    
    doc.setFontSize(9); 
    doc.text('Sistema de Ponto Eletrônico', 195, 15, { align: 'right' });
    doc.text('Conformidade Portaria 671', 195, 20, { align: 'right' });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 195, 25, { align: 'right' });

    // === BARRA CINZA (AJUSTE DE LAYOUT MILIMÉTRICO) ===
    doc.setFillColor(245, 245, 245); 
    doc.rect(14, 45, 182, 25, 'F');
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    
    // 1. FUNCIONÁRIO (Esquerda)
    doc.setFont('helvetica', 'bold'); doc.text('FUNCIONÁRIO:', 18, 52); 
    doc.setFont('helvetica', 'normal'); 
    let nomeFuncionario = ehRelatorioGeral ? 'TODOS OS COLABORADORES' : filtro.usuario;
    // Trunca para 22 caracteres para não bater no Período
    if (nomeFuncionario.length > 22) nomeFuncionario = nomeFuncionario.substring(0, 22) + '...';
    doc.text(nomeFuncionario, 18, 58);
    
    // 2. PERÍODO (Centro-Esquerda, X=85)
    // Movido um pouco para esquerda para fugir dos cards
    const xPeriodo = 80; 
    doc.setFont('helvetica', 'bold'); doc.text('PERÍODO:', xPeriodo, 52); 
    doc.setFont('helvetica', 'normal'); 
    doc.text(`${format(filtro.inicio, 'dd/MM/yyyy')} até ${format(filtro.fim, 'dd/MM/yyyy')}`, xPeriodo, 58);

    // 3. CARDS (Direita - Comprimidos)
    if (resumoHoras && !ehRelatorioGeral) {
      const cardY = 45;
      const cardHeight = 25;
      const cardWidth = 22; // REDUZIDO DE 26 PARA 22 PARA CABER TUDO
      
      const endX = 196; // Fim da barra cinza
      
      const xCard3 = endX - cardWidth; // Banco (Último)
      const xCard2 = xCard3 - cardWidth - 2; // Horas (Meio)
      const xCard1 = xCard2 - cardWidth - 2; // Dias (Primeiro)

      // CARD 1: DIAS TRABALHADOS (Se houver período)
      // Se não for período (1 dia), não mostra este card e empurra os outros para a direita
      // Mas para manter design fixo, vamos manter as posições relativas à direita.
      
      if (ehPeriodo) {
          doc.setFillColor(59, 130, 246); // Azul
          doc.roundedRect(xCard1, cardY, cardWidth, cardHeight, 2, 2, 'F');
          
          doc.setTextColor(255, 255, 255); 
          doc.setFontSize(6); doc.text('DIAS', xCard1 + (cardWidth/2), cardY + 7, { align: 'center' });
          
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); 
          doc.text(String(diasTrabalhados), xCard1 + (cardWidth/2), cardY + 17, { align: 'center' });
      }

      // CARD 2: HORAS TOTAIS
      doc.setFillColor(124, 58, 237); // Roxo
      // Se não for período, o card de horas assume a posição do card 1? Não, vamos alinhar à direita sempre.
      // Se não tiver card de dias, os cards ficam onde estão (vão sobrar espaço na esquerda, o que é bom para o Período).
      const posHorasFinal = ehPeriodo ? xCard2 : xCard3 - cardWidth - 2;

      doc.roundedRect(posHorasFinal, cardY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); 
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text('HORAS', posHorasFinal + (cardWidth/2), cardY + 7, { align: 'center' });
      
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); // Fonte levemente menor
      doc.text(resumoHoras.total || "0h", posHorasFinal + (cardWidth/2), cardY + 17, { align: 'center' });

      // CARD 3: BANCO DE HORAS
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

    if (ehRelatorioGeral) {
        colunas = [
            { header: 'Nome', dataKey: 'nomeFunc' },
            { header: 'Data', dataKey: 'dataFormatada' },
            { header: 'Dia', dataKey: 'diaSemana' },
            { header: 'E1', dataKey: 'e1' }, { header: 'S1', dataKey: 's1' },
            { header: 'E2', dataKey: 'e2' }, { header: 'S2', dataKey: 's2' },
            { header: 'Obs', dataKey: 'obs' },
        ];
        colStyles = { 
            0: { cellWidth: 35, fontStyle: 'bold' }, 
            1: { cellWidth: 18 }, 
            2: { cellWidth: 12 }, // Dia com 3 letras cabe aqui
            3: { cellWidth: 10 }, 4: { cellWidth: 10 }, 5: { cellWidth: 10 }, 6: { cellWidth: 10 }, 
            7: { cellWidth: 'auto' } 
        };
    } else {
        colunas = [
            { header: 'Data', dataKey: 'dataFormatada' },
            { header: 'Dia', dataKey: 'diaSemana' },
            { header: 'Ent.', dataKey: 'e1' }, { header: 'Sai.', dataKey: 's1' },
            { header: 'Ent.', dataKey: 'e2' }, { header: 'Sai.', dataKey: 's2' },
            { header: 'Observações', dataKey: 'obs' },
        ];
        colStyles = { 
            0: { cellWidth: 20 },
            1: { cellWidth: 15 }, // Dia com 3 letras cabe folgado aqui
            2: { cellWidth: 12 }, 3: { cellWidth: 12 },
            4: { cellWidth: 12 }, 5: { cellWidth: 12 },
            6: { cellWidth: 'auto' }
        };
    }

    autoTable(doc, {
      body: dadosProcessados,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle', halign: 'center' },
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