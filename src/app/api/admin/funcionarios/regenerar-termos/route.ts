import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import jsPDF from 'jspdf';
import { storagePut } from '@/lib/storage';
import { format } from 'date-fns';

async function fetchImageAsDataUri(url: string): Promise<{ dataUri: string; formato: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const isPNG = uint8[0] === 0x89 && uint8[1] === 0x50;
    const isJPEG = uint8[0] === 0xFF && uint8[1] === 0xD8;
    const formato = isPNG ? 'PNG' : isJPEG ? 'JPEG' : 'PNG';

    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = formato === 'JPEG' ? 'image/jpeg' : 'image/png';

    return { dataUri: `data:${mimeType};base64,${base64}`, formato };
  } catch {
    return null;
  }
}

function gerarPdfTermo(
  usuario: { nome: string; email: string; cpf: string; tituloCargo: string | null; assinaturaUrl: string | null },
  empresa: { nome: string; cnpj: string | null },
  opcao: string,
  data: Date,
  assinaturaImg: { dataUri: string; formato: string } | null,
): Buffer {
  const doc = new jsPDF();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const footerH = 16;

  const cpfFormatado = usuario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  // Header roxo
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageW, 42, 'F');
  doc.setFillColor(88, 28, 135);
  doc.rect(0, 38, pageW, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('WorkID', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Termo de Ciência — Uso de Dispositivo para Ponto', 14, 26);
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 255);
  doc.text(`Gerado em ${format(data, "dd/MM/yyyy 'às' HH:mm")}`, 14, 33);

  // Dados do Funcionário
  let y = 54;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Funcionário', 14, y); y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${usuario.nome}`, 14, y); y += 6;
  doc.text(`E-mail: ${usuario.email}`, 14, y); y += 6;
  doc.text(`CPF: ${cpfFormatado}`, 14, y); y += 6;
  if (usuario.tituloCargo) {
    doc.text(`Cargo: ${usuario.tituloCargo}`, 14, y); y += 6;
  }

  // Dados da Empresa
  y += 4;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados da Empresa', 14, y); y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Empresa: ${empresa.nome}`, 14, y); y += 6;
  if (empresa.cnpj) {
    doc.text(`CNPJ: ${empresa.cnpj}`, 14, y); y += 6;
  }

  // Declaração
  y += 6;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Declaração', 14, y); y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const dispositivo = opcao === 'PROPRIO'
    ? 'meu celular pessoal (de minha propriedade)'
    : 'celular fornecido pela empresa';

  const textoDeclaracao = `Eu, ${usuario.nome}, portador(a) do CPF ${cpfFormatado}, declaro para os devidos fins que, para o registro de ponto eletrônico digital junto à empresa ${empresa.nome}, utilizarei ${dispositivo}.`;
  const linhas = doc.splitTextToSize(textoDeclaracao, 180);
  doc.text(linhas, 14, y);
  y += linhas.length * 6;

  y += 6;
  const textoLivre = 'Declaro que esta escolha foi feita de forma livre e espontânea, sem qualquer obrigação ou imposição por parte do empregador.';
  const linhasLivre = doc.splitTextToSize(textoLivre, 180);
  doc.text(linhasLivre, 14, y);
  y += linhasLivre.length * 6;

  // Opção escolhida (destaque)
  y += 8;
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(14, y - 4, 180, 14, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(88, 28, 135);
  const textoOpcao = opcao === 'PROPRIO'
    ? 'Dispositivo escolhido: CELULAR PESSOAL (PRÓPRIO)'
    : 'Dispositivo escolhido: CELULAR DA EMPRESA';
  doc.text(textoOpcao, 20, y + 5);

  // Data
  y += 14;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${format(data, 'dd/MM/yyyy')}`, 14, y);
  doc.text(`Hora: ${format(data, 'HH:mm:ss')}`, 100, y);

  // Assinatura centralizada no final
  const assinaturaY = pageH - footerH - 50;

  if (assinaturaImg) {
    const imgW = 70;
    const imgH = 25;
    const imgX = (pageW - imgW) / 2;
    doc.addImage(assinaturaImg.dataUri, assinaturaImg.formato, imgX, assinaturaY, imgW, imgH);
  }

  const lineW = 80;
  const lineX = (pageW - lineW) / 2;
  const lineY = assinaturaY + 28;
  doc.setDrawColor(180, 180, 180);
  doc.line(lineX, lineY, lineX + lineW, lineY);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(usuario.nome, pageW / 2, lineY + 6, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Assinatura digital — documento gerado eletronicamente pelo sistema WorkID', pageW / 2, lineY + 11, { align: 'center' });

  // Footer
  doc.setFillColor(248, 248, 252);
  doc.rect(0, pageH - footerH, pageW, footerH, 'F');
  doc.setTextColor(160, 160, 180);
  doc.setFontSize(7);
  doc.text('WorkID — Ponto Digital Inteligente | Este documento tem validade jurídica como registro eletrônico.', pageW / 2, pageH - 7, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function POST() {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    // @ts-ignore
    const empresaId = session.user.empresaId;

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nome: true, cnpj: true },
    });

    if (!empresa) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });
    }

    // Buscar todos os funcionários que já assinaram o termo
    const funcionarios = await prisma.usuario.findMany({
      where: {
        empresaId,
        cargo: { not: 'ADMIN' },
        cienciaCelularDocUrl: { not: null },
        cpf: { not: null },
        cienciaCelularOpcao: { not: null },
        cienciaCelularData: { not: null },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        tituloCargo: true,
        assinaturaUrl: true,
        cienciaCelularOpcao: true,
        cienciaCelularData: true,
      },
    });

    let atualizados = 0;

    for (const func of funcionarios) {
      // Baixar assinatura se existir
      let assinaturaImg: { dataUri: string; formato: string } | null = null;
      if (func.assinaturaUrl) {
        assinaturaImg = await fetchImageAsDataUri(func.assinaturaUrl);
      }

      const pdfBuffer = gerarPdfTermo(
        { nome: func.nome, email: func.email, cpf: func.cpf!, tituloCargo: func.tituloCargo, assinaturaUrl: func.assinaturaUrl },
        empresa,
        func.cienciaCelularOpcao!,
        func.cienciaCelularData!,
        assinaturaImg,
      );

      const nomeArquivo = `ciencia-celular-${func.id}-${Date.now()}.pdf`;
      const blob = await storagePut(nomeArquivo, pdfBuffer, {
        access: 'public',
        contentType: 'application/pdf',
        permanente: true,
      });

      await prisma.usuario.update({
        where: { id: func.id },
        data: { cienciaCelularDocUrl: blob.url },
      });

      atualizados++;
    }

    return NextResponse.json({
      success: true,
      atualizados,
    });
  } catch (error) {
    console.error('Erro ao regenerar termos:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
