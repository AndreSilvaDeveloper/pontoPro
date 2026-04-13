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

    // Usar orientação definida pelo admin ao enviar o contracheque
    const orientacao = (contracheque as any).orientacao || 'RETRATO';
    const isLandscape = orientacao === 'PAISAGEM';
    const rotation = lastPage.getRotation().angle;

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

    if (isLandscape) {
      // Conteúdo do PDF está em paisagem (deitado). Desenhar rotacionado 90° anti-horário
      // para que visualmente fique "em pé" quando o usuário girar o documento.
      // No pdf-lib, a rotação é feita com degrees({angle: 90}) e o ponto x,y se torna o canto inferior esquerdo após rotação.
      const { degrees } = await import('pdf-lib');

      // Rotação -90° (270°): a assinatura fica virada corretamente quando o documento é visto em pé
      // Com rotação -90°, o desenho cresce para baixo e para a esquerda a partir de (sigX, sigY)
      const sigX = 50; // próximo da borda esquerda do PDF
      const sigY = (height + sigWidth) / 2; // centralizado, ajustado pela rotação

      lastPage.drawImage(sigImage, {
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
        rotate: degrees(-90),
      });

      // Nome - rotacionado -90°
      const nomeWidth = font.widthOfTextAtSize(nome, fontSize);
      lastPage.drawText(nome, {
        x: sigX + sigHeight + 10,
        y: sigY - (sigWidth - nomeWidth) / 2,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
        rotate: degrees(-90),
      });

      // Data - rotacionada -90°
      const dataWidth = font.widthOfTextAtSize(dataTexto, fontSize - 1);
      lastPage.drawText(dataTexto, {
        x: sigX + sigHeight + 20,
        y: sigY - (sigWidth - dataWidth) / 2,
        size: fontSize - 1,
        font,
        color: rgb(0.5, 0.5, 0.5),
        rotate: degrees(-90),
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
