import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  // Segurança: Só Admin logado pode ver
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const funcionarios = await prisma.usuario.findMany({
      where: {
        empresaId: session.user.empresaId, // Só da empresa dele!
        cargo: 'FUNCIONARIO', // Não lista ele mesmo
      },
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(funcionarios);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    // Agora recebemos também as coordenadas e o raio
    const { nome, email, latitude, longitude, raio } = await request.json();

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: 'mudar123',
        deveTrocarSenha: true,
        cargo: 'FUNCIONARIO',
        empresaId: session.user.empresaId,
        // Salvamos a regra geográfica específica deste funcionário
        latitudeBase: parseFloat(latitude),
        longitudeBase: parseFloat(longitude),
        raioPermitido: parseInt(raio) || 100, // Padrão 100 metros se não informar
      }
    });

    return NextResponse.json(novoUsuario);

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao criar' }, { status: 500 });
  }
}