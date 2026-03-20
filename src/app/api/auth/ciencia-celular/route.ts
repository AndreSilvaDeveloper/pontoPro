import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import jsPDF from 'jspdf';
import { storagePut } from '@/lib/storage';
import { format } from 'date-fns';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { cpf, opcao } = await request.json();

    // Validação CPF (11 dígitos)
    const cpfLimpo = (cpf || '').replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return NextResponse.json({ erro: 'CPF inválido. Informe 11 dígitos.' }, { status: 400 });
    }

    // Validação opção
    if (!['PROPRIO', 'EMPRESA'].includes(opcao)) {
      return NextResponse.json({ erro: 'Opção inválida.' }, { status: 400 });
    }

    // Buscar dados do funcionário e empresa
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        tituloCargo: true,
        deveCadastrarFoto: true,
        assinaturaUrl: true,
        fotoPerfilUrl: true,
        empresa: {
          select: {
            nome: true,
            cnpj: true,
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Gerar PDF
    const agora = new Date();
    const doc = new jsPDF();

    // Header roxo
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, 210, 42, 'F');
    doc.setFillColor(88, 28, 135);
    doc.rect(0, 38, 210, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('WorkID', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Termo de Ciência — Uso de Dispositivo para Ponto', 14, 26);
    doc.setFontSize(8);
    doc.setTextColor(220, 220, 255);
    doc.text(`Gerado em ${format(agora, "dd/MM/yyyy 'às' HH:mm")}`, 14, 33);

    // Dados do Funcionário
    let y = 54;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados do Funcionário', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${usuario.nome}`, 14, y); y += 6;
    doc.text(`E-mail: ${usuario.email}`, 14, y); y += 6;
    doc.text(`CPF: ${cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`, 14, y); y += 6;
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
    doc.text(`Empresa: ${usuario.empresa?.nome || 'N/A'}`, 14, y); y += 6;
    if (usuario.empresa?.cnpj) {
      doc.text(`CNPJ: ${usuario.empresa.cnpj}`, 14, y); y += 6;
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

    const textoDeclaracao = `Eu, ${usuario.nome}, portador(a) do CPF ${cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}, declaro para os devidos fins que, para o registro de ponto eletrônico digital junto à empresa ${usuario.empresa?.nome || 'empregadora'}, utilizarei ${dispositivo}.`;

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
    doc.text(`Data: ${format(agora, 'dd/MM/yyyy')}`, 14, y);
    doc.text(`Hora: ${format(agora, 'HH:mm:ss')}`, 100, y);

    // Assinatura centralizada no final da página
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    const footerH = 16;
    const assinaturaY = pageH - footerH - 50; // 50mm acima do footer

    // Incluir assinatura do funcionário se existir
    if (usuario.assinaturaUrl) {
      try {
        const assinaturaRes = await fetch(usuario.assinaturaUrl);
        if (assinaturaRes.ok) {
          const assinaturaArrayBuffer = await assinaturaRes.arrayBuffer();
          const assinaturaUint8 = new Uint8Array(assinaturaArrayBuffer);

          const isPNG = assinaturaUint8[0] === 0x89 && assinaturaUint8[1] === 0x50;
          const isJPEG = assinaturaUint8[0] === 0xFF && assinaturaUint8[1] === 0xD8;
          const formato = isPNG ? 'PNG' : isJPEG ? 'JPEG' : 'PNG';

          const assinaturaBase64 = Buffer.from(assinaturaArrayBuffer).toString('base64');
          const mimeType = formato === 'JPEG' ? 'image/jpeg' : 'image/png';
          const assinaturaDataUri = `data:${mimeType};base64,${assinaturaBase64}`;

          const imgW = 70;
          const imgH = 25;
          const imgX = (pageW - imgW) / 2;
          doc.addImage(assinaturaDataUri, formato, imgX, assinaturaY, imgW, imgH);
        }
      } catch (e) {
        console.error('Erro ao carregar assinatura para PDF:', e);
      }
    }

    // Linha e nome centralizados
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

    // Converter para Buffer e upload
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const nomeArquivo = `ciencia-celular-${session.user.id}-${Date.now()}.pdf`;
    const blob = await storagePut(nomeArquivo, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
      permanente: true,
    });

    // Salvar no banco
    const atualizado = await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        cpf: cpfLimpo,
        cienciaCelularOpcao: opcao,
        cienciaCelularData: agora,
        cienciaCelularDocUrl: blob.url,
        deveDarCienciaCelular: false,
      },
      select: {
        deveCadastrarFoto: true,
        assinaturaUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      docUrl: blob.url,
      deveCadastrarFoto: atualizado.deveCadastrarFoto,
      temAssinatura: !!atualizado.assinaturaUrl,
    });
  } catch (error) {
    console.error('Erro ao processar ciência de celular:', error);
    return NextResponse.json({ erro: 'Erro interno ao salvar.' }, { status: 500 });
  }
}
