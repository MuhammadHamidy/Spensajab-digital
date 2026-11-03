import { NextRequest, NextResponse } from 'next/server';
import { parseRegister } from '@/lib/features/auth/presentation/dto/RegisterRequestDto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = parseRegister(body);

    const { AuthContainer } = await import('@/lib/features/auth/AuthContainer');
    const container = AuthContainer.getInstance();
    const result = await container.registerUseCase.execute({ email, password, name });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
