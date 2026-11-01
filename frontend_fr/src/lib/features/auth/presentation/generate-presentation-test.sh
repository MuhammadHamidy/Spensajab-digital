#!/bin/bash
set -e

echo "Generating Auth Presentation tests..."

BASE_DIR="src/lib/features/auth/presentation"

# ----------------------
# DTO tests (Login, Register, Refresh)
# ----------------------
mkdir -p $BASE_DIR/dto/__tests__

# Login DTO
cat > $BASE_DIR/dto/__tests__/Login.test.ts << 'EOF'
import { parseLogin } from '@/lib/features/auth/presentation/dto/Login';
import { z } from 'zod';

describe('Login DTO', () => {
  it('parses valid data', () => {
    const data = { email: 'a@b.com', password: '123456' };
    const result = parseLogin(data);
    expect(result.email).toBe('a@b.com');
  });

  it('throws on invalid email', () => {
    expect(() => parseLogin({ email: 'invalid', password: '123456' })).toThrow(z.ZodError);
  });

  it('throws on short password', () => {
    expect(() => parseLogin({ email: 'a@b.com', password: '123' })).toThrow(z.ZodError);
  });
});
EOF

# Register DTO
cat > $BASE_DIR/dto/__tests__/Register.test.ts << 'EOF'
import { parseRegister } from '@/lib/features/auth/presentation/dto/Register';
import { z } from 'zod';

describe('Register DTO', () => {
  it('parses valid data', () => {
    const data = { email: 'a@b.com', password: '123456', name: 'User' };
    const result = parseRegister(data);
    expect(result.name).toBe('User');
  });

  it('throws on missing email', () => {
    expect(() => parseRegister({ password: '123456' })).toThrow(z.ZodError);
  });
});
EOF

# Refresh DTO
cat > $BASE_DIR/dto/__tests__/Refresh.test.ts << 'EOF'
import { parseRefresh } from '@/lib/features/auth/presentation/dto/Refresh';
import { z } from 'zod';

describe('Refresh DTO', () => {
  it('parses valid token', () => {
    const data = { refreshToken: 'longenoughtoken' };
    const result = parseRefresh(data);
    expect(result.refreshToken).toBe('longenoughtoken');
  });

  it('throws on short token', () => {
    expect(() => parseRefresh({ refreshToken: 'short' })).toThrow(z.ZodError);
  });
});
EOF

# ----------------------
# Middleware tests
# ----------------------
mkdir -p $BASE_DIR/middleware/__tests__

cat > $BASE_DIR/middleware/__tests__/requireAuth.test.ts << 'EOF'
import { requireAuth } from '../requireAuth';
import { JwtTokenService } from '@/lib/features/auth/infrastructure/adapter/TokenServiceJwt';

jest.mock('@/lib/features/auth/infrastructure/adapter/TokenServiceJwt');

describe('requireAuth middleware', () => {
  const jsonMock = jest.fn();
  const statusMock = jest.fn(() => ({ json: jsonMock }));
  const req: any = { headers: {} };
  const res: any = { status: statusMock };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null if no auth header', async () => {
    const result = await requireAuth(req, res);
    expect(result).toBeNull();
    expect(statusMock).toHaveBeenCalledWith(401);
  });

  it('calls token verify if header present', async () => {
    const verifyMock = jest.fn().mockReturnValue({ userId: '1' });
    (JwtTokenService as jest.Mock).mockImplementation(() => ({ verify: verifyMock }));
    req.headers.authorization = 'Bearer token';
    const result = await requireAuth(req, res);
    expect(result).toEqual({ userId: '1' });
    expect(verifyMock).toHaveBeenCalledWith('token');
  });

  it('returns null if verify throws', async () => {
    const verifyMock = jest.fn(() => { throw new Error('fail'); });
    (JwtTokenService as jest.Mock).mockImplementation(() => ({ verify: verifyMock }));
    req.headers.authorization = 'Bearer token';
    const result = await requireAuth(req, res);
    expect(result).toBeNull();
    expect(statusMock).toHaveBeenCalledWith(expect.any(Number));
  });
});
EOF

echo "Auth Presentation tests generated."
echo "Run tests with: npx jest"
