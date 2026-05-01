import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

/**
 * Converte uma URL de assinatura em data URL base64 (server-side).
 * Resolve o problema de CORS no client quando o admin está em subdomínio
 * diferente do storage (ex: app.workid.com.br lendo /api/uploads em workid.com.br).
 *
 * - URL local "/api/uploads/..." → lê direto do disco
 * - URL absoluta → fetch server-side (sem CORS)
 */
async function carregarAssinaturaBase64(assinaturaUrl: string | null): Promise<string | null> {
  if (!assinaturaUrl) return null;

  try {
    const marker = '/api/uploads/';
    const idx = assinaturaUrl.indexOf(marker);

    if (idx !== -1) {
      const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');
      const relativePath = assinaturaUrl.substring(idx + marker.length).split('?')[0];
      const absolutePath = path.join(LOCAL_DIR, relativePath);
      if (!absolutePath.startsWith(LOCAL_DIR)) return null;
      if (!fs.existsSync(absolutePath)) {
        console.warn('[fechamento GET] arquivo de assinatura não existe no disco:', absolutePath);
        return null;
      }
      const buffer = fs.readFileSync(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }

    // URL absoluta (ex: Vercel Blob) — fetch server-side
    const res = await fetch(assinaturaUrl);
    if (!res.ok) {
      console.warn('[fechamento GET] falha ao baixar assinatura:', res.status, assinaturaUrl);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('[fechamento GET] erro ao carregar assinatura:', err);
    return null;
  }
}

// GET — detalhes (admin) — inclui snapshot completo pra renderizar PDF
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string;
  const { id } = await params;

  const fechamento = await prisma.fechamento.findFirst({
    where: { id, empresaId },
    include: {
      funcionario: { select: { id: true, nome: true, tituloCargo: true, cpf: true, pis: true } },
      adminCriador: { select: { id: true, nome: true } },
    },
  });
  if (!fechamento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });

  // Pré-carrega a assinatura como base64 pra evitar CORS no client durante geração do PDF
  const assinaturaBase64 = fechamento.status === 'ASSINADO'
    ? await carregarAssinaturaBase64(fechamento.assinaturaUrl)
    : null;

  return NextResponse.json({ ...fechamento, assinaturaBase64 });
}

// DELETE — exclui fechamento permanentemente (qualquer status)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string;
  const { id } = await params;

  const fechamento = await prisma.fechamento.findFirst({
    where: { id, empresaId },
    select: { id: true },
  });
  if (!fechamento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });

  await prisma.fechamento.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
