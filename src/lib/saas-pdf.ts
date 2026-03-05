// src/lib/saas-pdf.ts — Geração de PDFs para o painel SaaS
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { gerarPayloadPix } from "./pix";
import { calcularFinanceiro } from "./saas-financeiro";

/**
 * Gera PDF de fatura individual com QR PIX.
 * Retorna a blob URL para exibição.
 */
export async function gerarFaturaIndividual(
  empresa: any,
  chavePixManual: string
): Promise<string> {
  const fin = calcularFinanceiro(empresa);
  const doc = new jsPDF();

  const hoje = new Date();
  const vencimento = new Date();
  const diaVenc = Number(empresa?.diaVencimento || 15);

  vencimento.setDate(diaVenc);
  if (hoje.getDate() > diaVenc) vencimento.setMonth(vencimento.getMonth() + 1);

  const payloadPix = gerarPayloadPix(
    chavePixManual,
    "WorkID Sistemas",
    "Juiz de Fora",
    fin.valorFinal.toFixed(2),
    `FAT${format(new Date(), "MMyy")}`
  );

  // ─── Header roxo com gradiente ───
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, 210, 42, "F");
  doc.setFillColor(88, 28, 135);
  doc.rect(0, 38, 210, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("WorkID", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Demonstrativo de Serviços e Cobrança", 14, 26);
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 255);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 33);

  // Vencimento e total (lado direito)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`VENCIMENTO: ${format(vencimento, "dd/MM/yyyy")}`, 196, 18, {
    align: "right",
  });
  doc.setFontSize(16);
  doc.text(
    fin.valorFinal.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
    196,
    30,
    { align: "right" }
  );

  // ─── Dados do cliente ───
  doc.setFillColor(248, 248, 252);
  doc.rect(14, 50, 182, 30, "F");
  doc.setDrawColor(230, 230, 240);
  doc.rect(14, 50, 182, 30, "S");

  doc.setTextColor(100, 100, 120);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CLIENTE", 20, 57);

  doc.setTextColor(30, 30, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.nome.toUpperCase(), 20, 64);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 100);
  const infos = [];
  if (empresa.cnpj) infos.push(`CNPJ: ${empresa.cnpj}`);
  if (empresa.usuarios?.[0]?.nome) infos.push(`Responsável: ${empresa.usuarios[0].nome}`);
  doc.text(infos.join("  |  ") || "CNPJ: Não Informado", 20, 72);

  // ─── Tabela de itens ───
  const dadosTabela: any[] = [
    [
      `Assinatura Mensal (${fin.planoNome})`,
      "1",
      `R$ ${fin.valorBase.toFixed(2).replace(".", ",")}`,
      `R$ ${fin.valorBase.toFixed(2).replace(".", ",")}`,
    ],
  ];
  if (fin.vidasExcedentes > 0) {
    const plano = (await import("@/config/planos")).getPlanoConfig(empresa.plano);
    dadosTabela.push([
      `Funcionários Excedentes (${fin.vidasExcedentes} x R$ ${plano.extraFuncionario.toFixed(2).replace(".", ",")})`,
      `${fin.vidasExcedentes}`,
      `R$ ${plano.extraFuncionario.toFixed(2).replace(".", ",")}`,
      fin.custoVidas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ]);
  }
  if (fin.adminsExcedentes > 0) {
    const plano = (await import("@/config/planos")).getPlanoConfig(empresa.plano);
    dadosTabela.push([
      `Administradores Adicionais (${fin.adminsExcedentes} x R$ ${plano.extraAdmin.toFixed(2).replace(".", ",")})`,
      `${fin.adminsExcedentes}`,
      `R$ ${plano.extraAdmin.toFixed(2).replace(".", ",")}`,
      fin.custoAdmins.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ]);
  }

  autoTable(doc, {
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: dadosTabela,
    startY: 90,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: {
      fillColor: [55, 48, 83],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { halign: "center", cellWidth: 15 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", fontStyle: "bold", cellWidth: 42 },
    },
    foot: [
      [
        "",
        "",
        "TOTAL",
        fin.valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      ],
    ],
    footStyles: {
      fillColor: [237, 253, 237],
      textColor: [22, 101, 52],
      fontStyle: "bold",
      fontSize: 10,
      halign: "right",
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // ─── Seção PIX ───
  doc.setDrawColor(210, 210, 220);
  doc.setFillColor(252, 252, 255);
  doc.roundedRect(14, finalY, 182, 80, 4, 4, "FD");

  // Badge "PIX"
  doc.setFillColor(124, 58, 237);
  doc.roundedRect(18, finalY + 6, 42, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PAGAMENTO PIX", 21, finalY + 13);

  doc.setTextColor(80, 80, 100);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Chave Pix:", 20, finalY + 28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 50);
  doc.setFontSize(11);
  doc.text(chavePixManual, 20, finalY + 36);

  // Copia e cola
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 160);
  doc.setFont("helvetica", "normal");
  doc.text("Copia e Cola:", 20, finalY + 48);
  const splitPayload = doc.splitTextToSize(payloadPix, 108);
  doc.text(splitPayload, 20, finalY + 54);

  // QR Code
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      payloadPix
    )}`;
    doc.addImage(qrUrl, "PNG", 138, finalY + 8, 50, 50);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 140);
    doc.text("Escaneie no App do Banco", 145, finalY + 64);
  } catch {
    doc.setDrawColor(200, 200, 200);
    doc.rect(138, finalY + 8, 50, 50);
    doc.setFontSize(8);
    doc.text("QR indisponível", 148, finalY + 35);
  }

  // Footer
  doc.setFillColor(248, 248, 252);
  doc.rect(0, 280, 210, 17, "F");
  doc.setDrawColor(230, 230, 240);
  doc.line(14, 280, 196, 280);
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 170);
  doc.text("Este documento não possui valor fiscal de Nota Fiscal.", 105, 286, {
    align: "center",
  });
  doc.text("WorkID — Tecnologia em Gestão de Ponto", 105, 291, {
    align: "center",
  });

  return String(doc.output("bloburl"));
}

/**
 * Gera PDF de relatório geral de faturamento.
 * Retorna a blob URL para exibição.
 */
export function gerarRelatorioGeral(empresas: any[]): string {
  const doc = new jsPDF();

  // ─── Header ───
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, 210, 42, "F");
  doc.setFillColor(88, 28, 135);
  doc.rect(0, 38, 210, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("WorkID", 14, 18);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Geral de Faturamento", 14, 27);
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 255);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 34);

  // Stats cards
  const totalEmpresas = empresas.length;
  const totalFaturamento = empresas.reduce((acc, emp) => {
    const fin = calcularFinanceiro(emp);
    return acc + fin.valorFinal;
  }, 0);
  const totalVidas = empresas.reduce((acc, emp) => {
    const fin = calcularFinanceiro(emp);
    return acc + fin.totalVidas;
  }, 0);

  // Info direita no header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${totalEmpresas} empresas`, 196, 14, { align: "right" });
  doc.text(`${totalVidas} funcionários`, 196, 20, { align: "right" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    totalFaturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    196,
    30,
    { align: "right" }
  );
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 220, 255);
  doc.text("Receita total mensal", 196, 36, { align: "right" });

  // ─── Tabela ───
  const dadosTabela = empresas.map((emp) => {
    const fin = calcularFinanceiro(emp);
    return [
      emp.nome,
      emp.cnpj || "—",
      emp.plano || "—",
      String(fin.totalVidas),
      String(fin.totalAdmins),
      fin.valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ];
  });

  autoTable(doc, {
    head: [["Empresa", "CNPJ", "Plano", "Func.", "Admins", "Valor Mensal"]],
    body: dadosTabela,
    startY: 52,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3, valign: "middle" },
    headStyles: {
      fillColor: [55, 48, 83],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    columnStyles: {
      0: { fontStyle: "bold", halign: "left" },
      1: { halign: "center", fontSize: 7 },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    foot: [
      [
        "TOTAL",
        "",
        "",
        String(totalVidas),
        "",
        totalFaturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      ],
    ],
    footStyles: {
      fillColor: [237, 253, 237],
      textColor: [22, 101, 52],
      fontStyle: "bold",
      fontSize: 9,
      halign: "right",
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 170);
    doc.text(
      `WorkID — Relatório Geral  |  Página ${i} de ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }

  return String(doc.output("bloburl"));
}
