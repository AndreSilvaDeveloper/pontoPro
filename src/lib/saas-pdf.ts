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
    "Ontime Sistemas",
    "Juiz de Fora",
    fin.valorFinal.toFixed(2),
    `FAT${format(new Date(), "MMyy")}`
  );

  // Header roxo
  doc.setFillColor(88, 28, 135);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ONTIME SISTEMAS", 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Demonstrativo de Serviços e Cobrança", 14, 30);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`VENCIMENTO: ${format(vencimento, "dd/MM/yyyy")}`, 195, 20, {
    align: "right",
  });
  doc.setFontSize(14);
  doc.text(
    `TOTAL: ${fin.valorFinal.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`,
    195,
    30,
    { align: "right" }
  );

  // Dados do cliente
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE:", 14, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${empresa.nome.toUpperCase()}`, 14, 62);
  doc.text(`CNPJ: ${empresa.cnpj || "Não Informado"}`, 14, 68);
  doc.text(`Responsável: ${empresa.usuarios?.[0]?.nome || "Admin"}`, 14, 74);

  // Tabela de itens
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
    startY: 85,
    theme: "striped",
    headStyles: { fillColor: [55, 65, 81] },
    columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
    foot: [
      [
        "",
        "",
        "TOTAL A PAGAR",
        fin.valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      ],
    ],
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [22, 101, 52],
      fontStyle: "bold",
      halign: "right",
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;

  // Seção PIX
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, finalY, 182, 75, 3, 3, "FD");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(88, 28, 135);
  doc.text("PAGAMENTO VIA PIX", 20, finalY + 12);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Chave Pix:", 20, finalY + 25);
  doc.setFontSize(12);
  doc.text(chavePixManual, 20, finalY + 32);

  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      payloadPix
    )}`;
    doc.addImage(qrUrl, "PNG", 135, finalY + 5, 50, 50);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Escaneie no App do Banco", 142, finalY + 60);
  } catch {
    doc.rect(135, finalY + 5, 50, 50);
    doc.text("Erro QR", 145, finalY + 30);
  }

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Copia e Cola:", 20, finalY + 45);
  const splitPayload = doc.splitTextToSize(payloadPix, 110);
  doc.text(splitPayload, 20, finalY + 52);

  doc.setFontSize(8);
  doc.text("Este documento não possui valor fiscal de Nota Fiscal.", 105, 285, {
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
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Geral de Faturamento", 14, 20);

  const dadosTabela = empresas.map((emp) => {
    const fin = calcularFinanceiro(emp);
    return [
      emp.nome,
      emp.cnpj || "N/A",
      fin.totalVidas,
      fin.totalAdmins,
      fin.valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ];
  });

  autoTable(doc, {
    head: [["Empresa", "CNPJ", "Funcionários", "Admins", "Valor"]],
    body: dadosTabela,
    startY: 50,
  });

  return String(doc.output("bloburl"));
}
