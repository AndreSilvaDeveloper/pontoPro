import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getHojeSP(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tipo = body?.tipo;

    if (!tipo || !['LANDING', 'SIGNUP_VISIT', 'SIGNUP_COMPLETE'].includes(tipo)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const hoje = getHojeSP();
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);

    if (tipo === 'LANDING') {
      // Visita landing — dedup por IP no dia
      const registro = await prisma.analitico.upsert({
        where: { data: hoje },
        create: { data: hoje, visitasLanding: 1, visitantesUnicos: [ipHash] },
        update: {},
      });

      const unicos = Array.isArray(registro.visitantesUnicos) ? registro.visitantesUnicos as string[] : [];
      if (!unicos.includes(ipHash)) {
        await prisma.analitico.update({
          where: { data: hoje },
          data: {
            visitasLanding: { increment: 1 },
            visitantesUnicos: [...unicos, ipHash],
          },
        });
      }
    } else if (tipo === 'SIGNUP_VISIT') {
      await prisma.analitico.upsert({
        where: { data: hoje },
        create: { data: hoje, visitasSignup: 1 },
        update: { visitasSignup: { increment: 1 } },
      });
    } else if (tipo === 'SIGNUP_COMPLETE') {
      await prisma.analitico.upsert({
        where: { data: hoje },
        create: { data: hoje, signups: 1 },
        update: { signups: { increment: 1 } },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // nunca falha para o cliente
  }
}
