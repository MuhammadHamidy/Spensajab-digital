#!/bin/bash
set -e

API_DIR="src/app/api/auth"

echo "✅ Creating Auth API endpoints for App Router..."

# Buat folders
mkdir -p $API_DIR/register
mkdir -p $API_DIR/login
mkdir -p $API_DIR/logout
mkdir -p $API_DIR/refresh

# register
cat > $API_DIR/register/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { parseRegister } from '@/lib/features/auth/presentation/dto/RegisterRequestDto';
import { AuthContainer } from '@/lib/features/auth/AuthContainer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = parseRegister(body);

    const container = AuthContainer.getInstance();
    const result = await container.registerUseCase.execute(email, password, name);

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
EOF

# login
cat > $API_DIR/login/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { parseLogin } from '@/lib/features/auth/presentation/dto/LoginRequestDto';
import { AuthContainer } from '@/lib/features/auth/AuthContainer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = parseLogin(body);

    const container = AuthContainer.getInstance();
    const result = await container.loginUseCase.execute(email, password);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
EOF

# logout
cat > $API_DIR/logout/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { AuthContainer } from '@/lib/features/auth/AuthContainer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const container = AuthContainer.getInstance();
    await container.logoutUseCase.execute(token);

    return NextResponse.json({ message: 'Logged out' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
EOF

# refresh
cat > $API_DIR/refresh/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { parseRefresh } from '@/lib/features/auth/presentation/dto/RefreshTokenDto';
import { AuthContainer } from '@/lib/features/auth/AuthContainer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = parseRefresh(body);

    const container = AuthContainer.getInstance();
    const result = await container.refreshUseCase.execute(refreshToken);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
EOF

echo "✅ Auth API endpoints created in $API_DIR using DTO parsers"
