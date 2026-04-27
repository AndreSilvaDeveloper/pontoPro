import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ajustei para o caminho absoluto padrão

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Se não estiver logado, retorna objeto vazio para não quebrar o front
  if (!session) return NextResponse.json({});

  try {
    const usuario = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        include: { empresa: true } // Traz os dados da empresa
    });

    if (!usuario || !usuario.empresa) {
        return NextResponse.json({});
    }

    // 1. Pega as configurações antigas (JSON)
    // Usamos 'as any' para o TypeScript não reclamar se for null
    const configsJSON = (usuario.empresa.configuracoes as any) || {};

    // 2. Pega a nova configuração de Fluxo Estrito (Coluna da Tabela)
    // Se for null/undefined, assumimos true por segurança
    const fluxoEstrito = usuario.empresa.fluxoEstrito !== false;

    // addonTotem efetivo (próprio ou herdado da matriz) — usado pra travar
    // o "ponto só pelo totem" só quando a empresa realmente tem o addon
    let addonTotemEfetivo = usuario.empresa.addonTotem === true;
    if (!addonTotemEfetivo && usuario.empresa.matrizId) {
        const matriz = await prisma.empresa.findUnique({
            where: { id: usuario.empresa.matrizId },
            select: { addonTotem: true },
        });
        addonTotemEfetivo = matriz?.addonTotem === true;
    }

    // 3. Dados de geofence do funcionário
    const geofence = {
        latitudeBase: (usuario as any).latitudeBase || 0,
        longitudeBase: (usuario as any).longitudeBase || 0,
        raioPermitido: (usuario as any).raioPermitido || 100,
        pontoLivre: (usuario as any).pontoLivre || false,
        modoValidacaoPonto: (usuario as any).modoValidacaoPonto || 'GPS',
        locaisAdicionais: (usuario as any).locaisAdicionais || null,
    };

    // 4. Mistura tudo num objeto só para o Front
    return NextResponse.json({
        ...configsJSON, // Espalha: exigirFoto, bloquearRaio, bloquearPontoApp, etc.
        fluxoEstrito,   // Adiciona: true ou false
        addonTotemEfetivo, // Adiciona: addon do Totem ativo (próprio ou matriz)
        ...geofence,    // Adiciona: latitudeBase, longitudeBase, raioPermitido, etc.
    });

  } catch (error) {
    console.error("Erro ao buscar configs:", error);
    return NextResponse.json({});
  }
}