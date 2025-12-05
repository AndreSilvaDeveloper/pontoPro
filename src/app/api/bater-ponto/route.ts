import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calcularDistancia } from '@/utils/geo';
import { put } from '@vercel/blob'; // Ferramenta oficial da Vercel

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuarioId, latitude, longitude, fotoBase64 } = body;

    console.log("📍 Processando ponto para:", usuarioId);

    // 1. Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
    }

    // 2. Validar Geofencing
    const distancia = calcularDistancia(
      latitude,
      longitude,
      usuario.latitudeBase,
      usuario.longitudeBase
    );

    if (distancia > usuario.raioPermitido) {
      return NextResponse.json(
        { erro: `Fora da área! Distância: ${Math.round(distancia)}m.` },
        { status: 400 }
      );
    }

    // 3. UPLOAD DA FOTO PARA A NUVEM ☁️📸
    let fotoUrlFinal = null;

    if (fotoBase64) {
      try {
        // Limpa o cabeçalho do base64 para pegar só os dados
        const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, "");
        // Converte texto em arquivo binário (Buffer)
        const buffer = Buffer.from(base64Data, 'base64');

        // Cria um nome único para o arquivo: ID-DATA.jpg
        const filename = `${usuario.id}-${Date.now()}.jpg`;

        // Envia para o Vercel Blob
        const blob = await put(filename, buffer, {
          access: 'public',
        });

        fotoUrlFinal = blob.url; // Recebe o link curto (https://...)
      } catch (err) {
        console.error("Erro ao subir foto:", err);
      }
    }

    // 4. Salvar o Ponto com o LINK (e não mais o texto gigante)
    const ponto = await prisma.ponto.create({
      data: {
        usuarioId: usuario.id,
        latitude,
        longitude,
        fotoUrl: fotoUrlFinal, 
      },
    });

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Ponto registrado com sucesso!', 
      distancia: Math.round(distancia),
      hora: ponto.dataHora
    });

  } catch (error) {
    console.error("Erro no servidor:", error);
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}