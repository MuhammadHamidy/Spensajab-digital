import { NextRequest, NextResponse } from 'next/server';
import { parseLogin } from '@/lib/features/auth/presentation/dto/LoginRequestDto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { email, password } = parseLogin(body);

    const { AuthContainer } = await import('@/lib/features/auth/AuthContainer');
    const container = AuthContainer.getInstance();
    const result = await container.loginUseCase.execute({ email, password });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
