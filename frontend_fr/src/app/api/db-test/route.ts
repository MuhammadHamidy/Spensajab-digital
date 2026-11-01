import { NextResponse } from 'next/server';
import prisma from '@/lib/common/database/PrismaClient';

export async function GET() {
  try {
    // coba query sederhana
    const result = await prisma.$queryRaw`SELECT 1+1 AS result;`;
    return NextResponse.json({ status: 'ok', db: result });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
