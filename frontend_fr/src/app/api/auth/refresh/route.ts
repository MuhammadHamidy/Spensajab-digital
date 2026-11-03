import { NextRequest, NextResponse } from 'next/server';
import { parseRefresh } from '@/lib/features/auth/presentation/dto/RefreshTokenDto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = parseRefresh(body);

    const { AuthContainer } = await import('@/lib/features/auth/AuthContainer');
    const container = AuthContainer.getInstance();
    const result = await container.refreshUseCase.execute({ refreshToken });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
