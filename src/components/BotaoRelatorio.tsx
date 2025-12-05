'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';

interface Ponto {
  id: string;
  dataHora: Date;
  usuario: {
    nome: string;
    email: string;
  };
  latitude: number;
  longitude: number;
}

export default function BotaoRelatorio({ pontos }: { pontos: Ponto[] }) {
  
  const gerarPDF = () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Ponto - Ponto Pro', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

    // Dados da Tabela
    const dadosFormatados = pontos.map((ponto) => [
      ponto.usuario.nome,
      format(new Date(ponto.dataHora), 'dd/MM/yyyy'),
      format(new Date(ponto.dataHora), 'HH:mm:ss'),
      `${ponto.latitude}, ${ponto.longitude}`, // Localização
    ]);

    // Cria a tabela
    autoTable(doc, {
      head: [['Funcionário', 'Data', 'Hora', 'GPS']],
      body: dadosFormatados,
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 163, 74] }, // Cor verde do nosso app
    });

    // Salva o arquivo
    doc.save('relatorio-ponto.pdf');
  };

  return (
    <button
      onClick={gerarPDF}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
    >
      <FileDown size={18} />
      Baixar PDF
    </button>
  );
}