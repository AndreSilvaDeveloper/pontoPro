import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { storagePut } from '@/lib/storage';

export const runtime = 'nodejs';

const ADMIN_CARGOS = ['ADMIN', 'SUPER_ADMIN', 'DONO'] as const;
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const MIME_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

function isAdmin(session: any) {
  const cargo = (session?.user as any)?.cargo;
  return Boolean(session?.user?.empresaId) && (ADMIN_CARGOS as readonly string[]).includes(cargo);
}

// GET: lê branding atual
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }
  const empresaId = (session!.user as any).empresaId as string;
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { nome: true, nomeExibicao: true, logoUrl: true, corPrimaria: true },
  });
  if (!empresa) return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });
  return NextResponse.json({
    nome: empresa.nome,
    nomeExibicao: empresa.nomeExibicao,
    logoUrl: empresa.logoUrl,
    corPrimaria: empresa.corPrimaria || '#7c3aed',
  });
}

// POST: atualiza branding (multipart: opcionalmente sobe logo + atualiza nome/cor)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }
  const empresaId = (session!.user as any).empresaId as string;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ erro: 'formato inválido (esperado multipart/form-data)' }, { status: 400 });
  }

  const nomeExibicaoRaw = formData.get('nomeExibicao');
  const corPrimariaRaw = formData.get('corPrimaria');
  const logoFile = formData.get('logo') as File | null;

  const updateData: { nomeExibicao?: string | null; corPrimaria?: string; logoUrl?: string } = {};

  if (typeof nomeExibicaoRaw === 'string') {
    const t = nomeExibicaoRaw.trim();
    updateData.nomeExibicao = t ? t.slice(0, 60) : null;
  }

  if (typeof corPrimariaRaw === 'string' && corPrimariaRaw.trim()) {
    const c = corPrimariaRaw.trim();
    // valida hex #rgb / #rrggbb
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) {
      return NextResponse.json({ erro: 'corPrimaria inválida (use #rgb ou #rrggbb)' }, { status: 400 });
    }
    updateData.corPrimaria = c;
  }

  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ erro: 'Logo maior que 2MB' }, { status: 413 });
    }
    if (!MIME_PERMITIDOS.has(logoFile.type)) {
      return NextResponse.json({ erro: 'Formato não suportado (use PNG, JPG, WEBP ou SVG)' }, { status: 415 });
    }
    const ext = logoFile.type === 'image/svg+xml' ? 'svg'
      : logoFile.type === 'image/jpeg' ? 'jpg'
      : logoFile.type === 'image/webp' ? 'webp' : 'png';
    const blob = await storagePut(`empresas/${empresaId}/logo-${Date.now()}.${ext}`, logoFile, {
      access: 'public',
      contentType: logoFile.type,
      permanente: true,
    });
    updateData.logoUrl = blob.url;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ erro: 'Nenhum campo enviado' }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({
    where: { id: empresaId },
    data: updateData,
    select: { nome: true, nomeExibicao: true, logoUrl: true, corPrimaria: true },
  });

  return NextResponse.json({
    ok: true,
    nome: empresa.nome,
    nomeExibicao: empresa.nomeExibicao,
    logoUrl: empresa.logoUrl,
    corPrimaria: empresa.corPrimaria || '#7c3aed',
  });
}

// DELETE: remove logo (mantém nome/cor)
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }
  const empresaId = (session!.user as any).empresaId as string;
  await prisma.empresa.update({
    where: { id: empresaId },
    data: { logoUrl: null },
  });
  return NextResponse.json({ ok: true });
}
