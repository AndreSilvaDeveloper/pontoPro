'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function BotaoRelatorio({ pontos, filtro, resumoHoras }: any) {
  
  const criarDocPDF = () => {
    const doc = new jsPDF();

    // Cabeçalho Roxo (WorkID)
    doc.setFillColor(124, 58, 237); // Roxo do Tailwind (purple-600)
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Relatório de Ponto - WorkID Corporate', 14, 15);
    doc.setFontSize(10);
    doc.text('Espelho de Ponto Eletrônico', 14, 22);
    
    // Dados do Filtro
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    const formatarDataLocal = (dataIso: any) => {
      if (!dataIso) return '--/--/----';
      const str = dataIso instanceof Date ? dataIso.toISOString().split('T')[0] : dataIso;
      const [ano, mes, dia] = str.split('-'); 
      return `${dia}/${mes}/${ano}`;
    };

    const inicioTexto = formatarDataLocal(filtro.inicio);
    const fimTexto = formatarDataLocal(filtro.fim);

    doc.text(`Período: ${inicioTexto} até ${fimTexto}`, 14, 40);
    doc.text(`Funcionário: ${filtro.usuario || 'Todos'}`, 14, 45);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 50);

    // === RESUMO DE HORAS ===
    if (resumoHoras) {
      // Caixa de destaque
      doc.setFillColor(245, 243, 255); // Roxo bem clarinho
      doc.rect(130, 35, 70, 20, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('TOTAL TRABALHADO:', 135, 42);
      
      doc.setFontSize(14);
      doc.setTextColor(124, 58, 237); // Roxo
      
      // Garante que mostre algo, mesmo que seja 0h 0m
      const textoTotal = resumoHoras.total ? resumoHoras.total : "0h 0m";
      doc.text(textoTotal, 135, 50);
    }
    // ======================

    // Tabela
    const dados = pontos.map((p: any) => [
      format(new Date(p.dataHora), 'dd/MM/yyyy'),
      format(new Date(p.dataHora), 'HH:mm'),
      p.tipo ? p.tipo.replace('_', ' ') : 'NORMAL',
      p.endereco ? p.endereco.substring(0, 35) : 'GPS'
    ]);

    autoTable(doc, {
      head: [['Data', 'Hora', 'Tipo', 'Local']],
      body: dados,
      startY: 60,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 9 },
    });

    return doc;
  };

  const baixarPDF = () => {
    const doc = criarDocPDF();
    doc.save(`relatorio-${filtro.usuario || 'geral'}.pdf`);
  };

  const visualizarPDF = () => {
    const doc = criarDocPDF();
    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="flex gap-2">
      <button onClick={visualizarPDF} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center w-full md:w-auto">
        <Eye size={18} /> Ver
      </button>
      <button onClick={baixarPDF} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] justify-center w-full md:w-auto">
        <FileDown size={18} /> Baixar
      </button>
    </div>
  );
}