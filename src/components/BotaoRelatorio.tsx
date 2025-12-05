'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function BotaoRelatorio({ pontos, filtro, resumoHoras }: any) {
  
  // Função que cria o documento PDF (reutilizável)
  const criarDocPDF = () => {
    const doc = new jsPDF();

    // Cabeçalho Verde
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Relatório de Ponto', 14, 15);
    doc.setFontSize(10);
    doc.text('Ponto Pro - Sistema de Gestão', 14, 21);
    
    // Dados do Filtro
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
   const formatarDataLocal = (dataIso: any) => {
      if (!dataIso) return '--/--/----';
      // Se já for objeto Date, converte para string YYYY-MM-DD
      const str = dataIso instanceof Date ? dataIso.toISOString().split('T')[0] : dataIso;
      // Quebra a string e monta manual (evita conversão de fuso)
      const [ano, mes, dia] = str.split('-'); 
      return `${dia}/${mes}/${ano}`;
    };

    const inicioTexto = formatarDataLocal(filtro.inicio);
    const fimTexto = formatarDataLocal(filtro.fim);
    // ================================

    doc.text(`Período: ${inicioTexto} até ${fimTexto}`, 14, 35);
    doc.text(`Funcionário: ${filtro.usuario || 'Todos'}`, 14, 40);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 45);

    // Resumo de Horas (Se houver)
    if (resumoHoras) {
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.5);
      doc.line(14, 48, 196, 48);
      
      doc.setFontSize(12);
      doc.setTextColor(22, 163, 74);
      doc.text(`Total Trabalhado: ${resumoHoras.total}`, 14, 55);
      
      if (resumoHoras.meta !== 'Não definida') {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`(Meta: ${resumoHoras.meta})`, 80, 55);
      }
    }

    // Tabela
    const dados = pontos.map((p: any) => [
      p.usuario.nome,
      format(new Date(p.dataHora), 'dd/MM/yyyy'),
      format(new Date(p.dataHora), 'HH:mm'),
      p.endereco ? p.endereco.substring(0, 45) : 'GPS'
    ]);

    autoTable(doc, {
      head: [['Nome', 'Data', 'Hora', 'Local']],
      body: dados,
      startY: resumoHoras ? 65 : 55,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
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
    // Abre o PDF numa nova aba do navegador
    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={visualizarPDF} 
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] transition-colors"
        title="Visualizar na tela"
      >
        <Eye size={18} /> Ver
      </button>
      
      <button 
        onClick={baixarPDF} 
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm h-[42px] transition-colors"
        title="Baixar arquivo"
      >
        <FileDown size={18} /> Baixar
      </button>
    </div>
  );
}