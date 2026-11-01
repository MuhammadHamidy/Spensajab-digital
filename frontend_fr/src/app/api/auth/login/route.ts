import { NextRequest, NextResponse } from 'next/server';
import { parseLogin } from '@/lib/features/auth/presentation/dto/LoginRequestDto';
import { AuthContainer } from '@/lib/features/auth/AuthContainer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { email, password } = parseLogin(body);

    const container = AuthContainer.getInstance();
    const result = await container.loginUseCase.execute({ email, password });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
