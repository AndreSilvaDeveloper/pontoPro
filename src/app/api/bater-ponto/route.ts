import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calcularDistancia } from '@/utils/geo';
import { put } from '@vercel/blob';
import { compararRostos } from '@/lib/rekognition'; 
import { obterEndereco } from '@/utils/geocoding'; 

export async function POST(request: Request) {


  try {
    const body = await request.json();
    const { usuarioId, latitude, longitude, fotoBase64, tipo } = body;

    console.log("📍 Processando ponto para:", usuarioId);

    // 1. Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
    }

    let enderecoLegivel = "Localização desconhecida";
    try {
      enderecoLegivel = await obterEndereco(latitude, longitude);
    } catch (err) {
      console.log("Falha ao obter endereço, salvando apenas GPS");
    }

    // 2. Validar Geofencing (Localização)
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

    // === 3. VALIDAÇÃO BIOMÉTRICA (NOVIDADE!) ===
    // Só validamos se o usuário tiver foto de perfil cadastrada e enviou foto agora
    if (usuario.fotoPerfilUrl && fotoBase64) {
      console.log("🔍 Iniciando validação facial na AWS...");
      const resultado = await compararRostos(usuario.fotoPerfilUrl, fotoBase64);
      
      if (!resultado.igual) {
         return NextResponse.json(
          { erro: 'Reconhecimento Facial Falhou! Rosto não confere com o cadastro.' },
          { status: 403 }
        );
      }
    }
    // ============================================

    // 4. Upload da Foto do Ponto
    let fotoUrlFinal = null;
    if (fotoBase64) {
      try {
        const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${usuario.id}-${Date.now()}.jpg`;
        const blob = await put(filename, buffer, { access: 'public' });
        fotoUrlFinal = blob.url;
      } catch (err) {
        console.error("Erro upload:", err);
      }
    }

    // 5. Salvar
    const ponto = await prisma.ponto.create({
      data: {
        usuarioId: usuario.id,
        latitude,
        longitude,
        fotoUrl: fotoUrlFinal, 
        endereco: enderecoLegivel,
        tipo: tipo || "NORMAL",
      },
    });

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Ponto registrado com sucesso!', 
      distancia: Math.round(distancia),
      hora: ponto.dataHora
    });

  } catch (error) {
    console.error("Erro servidor:", error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}