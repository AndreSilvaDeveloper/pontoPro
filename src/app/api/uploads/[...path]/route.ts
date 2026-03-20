import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads');

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relativePath = segments.join('/');

  // Prevenir path traversal
  if (relativePath.includes('..') || relativePath.includes('~')) {
    return NextResponse.json({ erro: 'Caminho inválido' }, { status: 400 });
  }

  const absolutePath = path.join(LOCAL_DIR, relativePath);

  if (!absolutePath.startsWith(LOCAL_DIR)) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ erro: 'Arquivo não encontrado' }, { status: 404 });
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const buffer = fs.readFileSync(absolutePath);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
