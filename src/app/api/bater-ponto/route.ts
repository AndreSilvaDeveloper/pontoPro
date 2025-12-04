import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calcularDistancia } from '../../utils/geo';


// Versão limpa e estável para Prisma 5
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuarioId, latitude, longitude, fotoBase64 } = body;

    console.log("📍 Recebendo ponto:", { latitude, longitude });

    // 1. Buscar usuário de teste (fixo por enquanto)
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'funcionario@teste.com' }, 
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário de teste não encontrado no banco.' }, { status: 404 });
    }

    // 2. Validar Geofencing
    const distancia = calcularDistancia(
      latitude,
      longitude,
      usuario.latitudeBase,
      usuario.longitudeBase
    );

    console.log(`📏 Distância: ${Math.round(distancia)}m (Permitido: ${usuario.raioPermitido}m)`);

    if (distancia > usuario.raioPermitido) {
      return NextResponse.json(
        { erro: `Fora da área! Você está a ${Math.round(distancia)}m da empresa.` },
        { status: 400 }
      );
    }

    // 3. Salvar o Ponto
    const ponto = await prisma.ponto.create({
      data: {
        usuarioId: usuario.id,
        latitude,
        longitude,
        fotoUrl: fotoBase64,
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