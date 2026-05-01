import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

async function urlParaBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface GerarPdfArgs {
  snapshot: any;
  status: 'PENDENTE' | 'ASSINADO' | 'RECUSADO' | 'CANCELADO';
  assinadoEm: string | null;
  assinaturaUrl: string | null;
  /** Assinatura já em data URL base64 (preferido — vem pré-carregada do servidor pra evitar CORS) */
  assinaturaBase64?: string | null;
  ipAssinatura: string | null;
  funcionario: { nome: string; tituloCargo: string | null; cpf: string | null; pis: string | null };
  modo?: 'baixar' | 'visualizar';
}

function fmtBR(yyyy_mm_dd: string): string {
  const [y, m, d] = yyyy_mm_dd.split('-');
  return `${d}/${m}/${y}`;
}

function fmtMin(min: number): string {
  const abs = Math.abs(min);
  return `${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`;
}

export async function gerarPdfFechamento(args: GerarPdfArgs): Promise<void> {
  const { snapshot: snap, status, assinadoEm, assinaturaUrl, assinaturaBase64, ipAssinatura, funcionario, modo = 'baixar' } = args;
  const doc = new jsPDF();

  // Header roxo
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(88, 28, 135);
  doc.rect(0, 35, 210, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text(snap.empresaNome || 'WorkID', 14, 16);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('Fechamento de Ponto', 14, 24);
  doc.setFontSize(8); doc.setTextColor(220, 220, 255);
  doc.text(`Gerado em ${new Date(snap.geradoEm).toLocaleString('pt-BR')}`, 14, 31);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Conformidade Portaria 671', 196, 14, { align: 'right' });

  // Bloco de identificação
  doc.setFillColor(248, 248, 252);
  doc.rect(14, 44, 182, 22, 'F');
  doc.setDrawColor(230, 230, 240);
  doc.rect(14, 44, 182, 22, 'S');

  doc.setTextColor(100, 100, 120); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('FUNCIONÁRIO', 18, 50);
  doc.setTextColor(30, 30, 50); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(funcionario.nome.substring(0, 40), 18, 56);
  doc.setTextColor(100, 100, 120); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(funcionario.tituloCargo || '—', 18, 61);

  doc.setTextColor(100, 100, 120); doc.setFontSize(7);
  doc.text('PERÍODO', 110, 50);
  doc.setTextColor(30, 30, 50); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(`${fmtBR(snap.periodo.inicio)} a ${fmtBR(snap.periodo.fim)}`, 110, 56);

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 120);
  if (funcionario.cpf) doc.text(`CPF: ${funcionario.cpf}`, 110, 61);
  if (funcionario.pis) doc.text(`PIS: ${funcionario.pis}`, 150, 61);

  // Cards de resumo
  const cardY = 72;
  const cardW = 44;
  const cards = [
    { label: 'TRABALHADO', value: snap.resumo.totalHorasTrabalhadas, color: [124, 58, 237] },
    { label: 'META', value: snap.resumo.totalMetaHoras, color: [59, 130, 246] },
    { label: 'SALDO', value: snap.resumo.saldoFormatado, color: snap.resumo.saldoPositivo ? [22, 163, 74] : [220, 38, 38] },
    { label: 'FALTAS', value: String(snap.resumo.diasFalta), color: snap.resumo.diasFalta > 0 ? [220, 38, 38] : [100, 116, 139] },
  ];
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + 2);
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.roundedRect(x, cardY, cardW, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(c.label, x + cardW / 2, cardY + 6, { align: 'center' });
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(c.value, x + cardW / 2, cardY + 14, { align: 'center' });
  });

  // Tabela de dias
  const rows = snap.dias.map((d: any) => {
    const batidas = d.batidas || [];
    return [
      fmtBR(d.data),
      d.diaSemana.toUpperCase(),
      d.status,
      batidas[0] || '-',
      batidas[1] || '-',
      batidas[2] || '-',
      batidas[3] || '-',
      batidas[4] || '-',
      batidas[5] || '-',
      fmtMin(d.minutosTrabalhados),
      fmtMin(d.metaMinutos),
    ];
  });

  autoTable(doc, {
    startY: 96,
    head: [['Data', 'Dia', 'Status', 'E1', 'S1', 'E2', 'S2', 'E3', 'S3', 'Trab.', 'Meta']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
    headStyles: { fillColor: [55, 48, 83], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 12 }, 2: { cellWidth: 22 },
      9: { cellWidth: 15 }, 10: { cellWidth: 15 },
    },
    didParseCell: (d) => {
      if (d.section === 'body') {
        const raw = d.row.raw as any[];
        const status = raw?.[2];
        if (status === 'FALTA') { d.cell.styles.fillColor = [254, 226, 226]; d.cell.styles.textColor = [180, 0, 0]; }
        else if (status === 'AUSENCIA') { d.cell.styles.fillColor = [219, 234, 254]; d.cell.styles.textColor = [29, 78, 216]; }
        else if (status === 'FERIADO') { d.cell.styles.fillColor = [243, 232, 255]; d.cell.styles.textColor = [107, 33, 168]; }
        else if (raw?.[1] === 'DOM') { d.cell.styles.fillColor = [240, 240, 245]; d.cell.styles.textColor = [140, 140, 160]; }
      }
    },
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 18;
  if (finalY > 250) { doc.addPage(); finalY = 30; }

  // Bloco de assinatura
  doc.setDrawColor(150, 150, 150);
  doc.line(14, finalY + 14, 100, finalY + 14);
  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text('Assinatura do Colaborador', 14, finalY + 19);

  if (status === 'ASSINADO' && assinadoEm) {
    // Prioriza base64 vindo do servidor (sem CORS); cai pro fetch do client se não tiver.
    const img = assinaturaBase64 ?? (assinaturaUrl ? await urlParaBase64(assinaturaUrl) : null);
    if (img) {
      const fmt = img.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      try { doc.addImage(img, fmt, 20, finalY - 5, 40, 18); } catch (e) { console.error('addImage assinatura falhou', e); }
    } else {
      console.warn('PDF fechamento: status ASSINADO mas sem imagem da assinatura disponível');
    }
    doc.setFontSize(7); doc.setTextColor(22, 163, 74);
    doc.text(`Assinado digitalmente em ${new Date(assinadoEm).toLocaleString('pt-BR')}`, 14, finalY + 24);
    if (ipAssinatura) doc.text(`IP: ${ipAssinatura}`, 14, finalY + 28);
  } else if (status === 'PENDENTE') {
    doc.setFillColor(255, 243, 224);
    doc.rect(14, finalY + 22, 182, 8, 'F');
    doc.setFontSize(8); doc.setTextColor(180, 100, 0); doc.setFont('helvetica', 'bold');
    doc.text('AGUARDANDO ASSINATURA DO COLABORADOR', 105, finalY + 27, { align: 'center' });
  } else if (status === 'RECUSADO') {
    doc.setFillColor(254, 226, 226);
    doc.rect(14, finalY + 22, 182, 8, 'F');
    doc.setFontSize(8); doc.setTextColor(180, 0, 0); doc.setFont('helvetica', 'bold');
    doc.text('FECHAMENTO CONTESTADO PELO COLABORADOR', 105, finalY + 27, { align: 'center' });
  }

  // Rodapé com paginação
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(160, 160, 170); doc.setFont('helvetica', 'normal');
    doc.text(`WorkID — Fechamento de Ponto  |  Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }

  const filename = `Fechamento_${funcionario.nome.replace(/\s+/g, '_')}_${snap.periodo.inicio}_${snap.periodo.fim}.pdf`;

  if (modo === 'visualizar') {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Em mobile abrir blob URL costuma falhar; baixa direto
      doc.save(filename);
    } else {
      const blobUrl = doc.output('bloburl');
      window.open(String(blobUrl), '_blank');
    }
  } else {
    doc.save(filename);
  }
}
