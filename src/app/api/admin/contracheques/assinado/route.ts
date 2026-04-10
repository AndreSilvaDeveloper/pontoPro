import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 });

    // @ts-ignore
    const empresaId = session.user.empresaId as string;

    const contracheque = await prisma.contracheque.findFirst({
      where: { id, empresaId },
      include: { usuario: { select: { nome: true } } },
    });

    if (!contracheque) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });
    if (!contracheque.assinado || !contracheque.assinaturaUrl) {
      return NextResponse.json({ erro: 'Contracheque ainda não foi assinado pelo funcionário' }, { status: 400 });
    }

    // 1. Baixar o PDF original
    const pdfOriginalUrl = contracheque.arquivoUrl.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${contracheque.arquivoUrl}`
      : contracheque.arquivoUrl;

    const pdfRes = await fetch(pdfOriginalUrl);
    if (!pdfRes.ok) return NextResponse.json({ erro: 'Erro ao baixar PDF original' }, { status: 500 });
    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());

    // 2. Baixar a imagem da assinatura
    const sigUrl = contracheque.assinaturaUrl.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${contracheque.assinaturaUrl}`
      : contracheque.assinaturaUrl;

    const sigRes = await fetch(sigUrl);
    if (!sigRes.ok) return NextResponse.json({ erro: 'Erro ao baixar assinatura' }, { status: 500 });
    const sigBytes = new Uint8Array(await sigRes.arrayBuffer());

    // 3. Editar o PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Detectar formato da assinatura (PNG ou JPG)
    const contentType = sigRes.headers.get('content-type') || '';
    let sigImage;
    if (contentType.includes('png') || sigUrl.toLowerCase().includes('.png')) {
      sigImage = await pdfDoc.embedPng(sigBytes);
    } else {
      sigImage = await pdfDoc.embedJpg(sigBytes);
    }

    // Detectar orientação: se página é mais larga que alta ou tem rotação, é paisagem
    const rotation = lastPage.getRotation().angle;
    const isLandscape = width > height || rotation === 90 || rotation === 270;

    // Dimensões da assinatura
    const sigAspect = sigImage.width / sigImage.height;
    const sigWidth = 200;
    const sigHeight = sigWidth / sigAspect;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 7;
    const nome = contracheque.usuario.nome;
    const dataAssinatura = contracheque.assinadoEm
      ? new Date(contracheque.assinadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : '';
    const dataTexto = `Assinado digitalmente em ${dataAssinatura}`;

    if (isLandscape && (rotation === 90 || rotation === 270)) {
      // Página rotacionada (como contracheques em paisagem)
      // Desenhar rotacionado: a assinatura fica "em pé" visualmente
      // No PDF rotacionado 90°, x vai para cima e y vai para a direita
      const sigX = (height - sigWidth) / 2; // centralizar no eixo visual
      const sigY = 50;

      lastPage.drawImage(sigImage, {
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
      });

      lastPage.drawLine({
        start: { x: sigX, y: sigY - 2 },
        end: { x: sigX + sigWidth, y: sigY - 2 },
        thickness: 0.5,
        color: rgb(0.3, 0.3, 0.3),
      });

      const nomeWidth = font.widthOfTextAtSize(nome, fontSize);
      lastPage.drawText(nome, {
        x: sigX + (sigWidth - nomeWidth) / 2,
        y: sigY - 14,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });

      const dataWidth = font.widthOfTextAtSize(dataTexto, fontSize - 1);
      lastPage.drawText(dataTexto, {
        x: sigX + (sigWidth - dataWidth) / 2,
        y: sigY - 24,
        size: fontSize - 1,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    } else {
      // Página normal (retrato) ou paisagem sem rotação
      const sigX = (width - sigWidth) / 2;
      const sigY = 50;

      lastPage.drawImage(sigImage, {
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
      });

      lastPage.drawLine({
        start: { x: sigX, y: sigY - 2 },
        end: { x: sigX + sigWidth, y: sigY - 2 },
        thickness: 0.5,
        color: rgb(0.3, 0.3, 0.3),
      });

      const nomeWidth = font.widthOfTextAtSize(nome, fontSize);
      lastPage.drawText(nome, {
        x: sigX + (sigWidth - nomeWidth) / 2,
        y: sigY - 14,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });

      const dataWidth = font.widthOfTextAtSize(dataTexto, fontSize - 1);
      lastPage.drawText(dataTexto, {
        x: sigX + (sigWidth - dataWidth) / 2,
        y: sigY - 24,
        size: fontSize - 1,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // 4. Gerar PDF final
    const pdfFinal = await pdfDoc.save();

    // Retornar como download
    const mesLabel = contracheque.mes.replace('-', '_');
    const nomeArquivo = `contracheque_${nome.replace(/\s+/g, '_')}_${mesLabel}_assinado.pdf`;

    return new NextResponse(Buffer.from(pdfFinal), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF assinado:', error);
    return NextResponse.json({ erro: 'Erro ao gerar PDF' }, { status: 500 });
  }
}
