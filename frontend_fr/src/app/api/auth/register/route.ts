import { NextRequest, NextResponse } from 'next/server';
import { parseRegister } from '@/lib/features/auth/presentation/dto/RegisterRequestDto';
import { AuthContainer } from '@/lib/features/auth/AuthContainer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = parseRegister(body);

    const container = AuthContainer.getInstance();
    const result = await container.registerUseCase.execute({ email, password, name });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
