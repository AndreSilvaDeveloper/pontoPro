import { NextResponse } from 'next/server';
import { getPlanosPublicos } from '@/lib/planos-db';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  const planos = await getPlanosPublicos();
  return NextResponse.json(
    { planos },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
