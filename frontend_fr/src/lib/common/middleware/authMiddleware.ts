import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../utils/token';

// Example Next.js middleware for JWT auth
export function authMiddleware(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');

    const payload = verifyToken<{ userId: string }>(token);
    // Attach user info to request (custom convention)
    (req as any).user = payload;

    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
