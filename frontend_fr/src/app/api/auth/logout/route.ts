// logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthContainer } from '@/lib/features/auth/AuthContainer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing refresh token' }, { status: 401 });
    }
    const refreshToken = authHeader.split(' ')[1];

    const container = AuthContainer.getInstance();
    await container.logoutUseCase.execute({ refreshToken });

    return NextResponse.json({ message: 'Logged out' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
