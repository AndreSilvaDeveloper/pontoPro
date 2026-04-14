import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generateSecret, verifyToken, generateBackupCodes } from '@/lib/twoFactor';
import { registrarLog } from '@/lib/logger';

// GET — status atual do 2FA do usuário
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }
  const user = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true },
  });
  return NextResponse.json({ enabled: !!user?.twoFactorEnabled });
}

// POST — inicia setup do 2FA (gera secret e QR); precisa confirmar depois
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }
  const user = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
  if (user.twoFactorEnabled) {
    return NextResponse.json({ erro: '2FA já está ativado' }, { status: 400 });
  }

  const { base32, uri } = generateSecret(user.email);
  // Guarda o secret temporariamente (ainda não habilita). Ativa só após confirmar no PUT.
  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: base32 },
  });
  return NextResponse.json({ secret: base32, uri });
}

// PUT — confirma o setup com um código válido e ativa o 2FA
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }
  const { codigo } = await req.json();
  const user = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true, empresaId: true, nome: true },
  });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ erro: 'Setup não iniciado' }, { status: 400 });
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json({ erro: '2FA já ativado' }, { status: 400 });
  }
  if (!verifyToken(user.twoFactorSecret, String(codigo || ''))) {
    return NextResponse.json({ erro: 'Código inválido. Verifique o horário do celular.' }, { status: 400 });
  }

  const { plain, hashed } = generateBackupCodes();
  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashed,
    },
  });

  if (user.empresaId) {
    await registrarLog({
      empresaId: user.empresaId,
      usuarioId: session.user.id,
      autor: user.nome,
      acao: '2FA_ATIVADO',
      detalhes: 'Autenticação em dois fatores ativada',
    });
  }

  return NextResponse.json({ success: true, backupCodes: plain });
}

// DELETE — desativa o 2FA (exige código atual pra evitar sequestro de sessão)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }
  const { codigo } = await req.json();
  const user = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true, empresaId: true, nome: true },
  });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ erro: '2FA não está ativo' }, { status: 400 });
  }
  if (!verifyToken(user.twoFactorSecret, String(codigo || ''))) {
    return NextResponse.json({ erro: 'Código inválido' }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: undefined as any,
    },
  });

  if (user.empresaId) {
    await registrarLog({
      empresaId: user.empresaId,
      usuarioId: session.user.id,
      autor: user.nome,
      acao: '2FA_DESATIVADO',
      detalhes: 'Autenticação em dois fatores desativada',
    });
  }

  return NextResponse.json({ success: true });
}
