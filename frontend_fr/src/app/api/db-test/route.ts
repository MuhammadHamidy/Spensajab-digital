import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { default: prisma } = await import('@/lib/common/database/PrismaClient');
    const result = await prisma.$queryRaw`SELECT 1+1 AS result;`;
    return NextResponse.json({ status: 'ok', db: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database connection failed';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
