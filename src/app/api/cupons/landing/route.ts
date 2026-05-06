import { NextResponse } from 'next/server';
import { listarCuponsPublicos } from '@/lib/cupons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cupons = await listarCuponsPublicos();
  return NextResponse.json(
    { cupons },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
