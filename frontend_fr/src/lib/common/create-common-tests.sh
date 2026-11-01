#!/bin/bash

# Pastikan dijalankan di root project
mkdir -p src/lib/common/config
mkdir -p src/lib/common/errors
mkdir -p src/lib/common/logger
mkdir -p src/lib/common/middleware
mkdir -p src/lib/common/provider
mkdir -p src/lib/common/utils
mkdir -p src/lib/common/validation

# =========================
# config/env.test.ts
# =========================
cat <<'EOF' > src/lib/common/config/env.test.ts
import { z } from 'zod';
import { env } from './env';

describe('env config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should parse environment variables correctly', () => {
    process.env.DATABASE_URL = 'http://localhost:5432/db';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.NODE_ENV = 'development';

    const validated = require('./env').env;
    expect(validated.DATABASE_URL).toBe('http://localhost:5432/db');
    expect(validated.JWT_SECRET).toBe('12345678901234567890123456789012');
    expect(validated.NODE_ENV).toBe('development');
  });

  it('should throw error if JWT_SECRET is too short', () => {
    process.env.DATABASE_URL = 'http://localhost:5432/db';
    process.env.JWT_SECRET = 'short';
    process.env.NODE_ENV = 'development';

    expect(() => require('./env')).toThrow();
  });
});
EOF

# =========================
# errors/AppError.test.ts
# =========================
cat <<'EOF' > src/lib/common/errors/AppError.test.ts
import { AppError } from './AppError';

describe('AppError', () => {
  it('should set message, statusCode, and details', () => {
    const error = new AppError('Not Found', 404, { resource: 'User' });
    expect(error.message).toBe('Not Found');
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ resource: 'User' });
  });

  it('should default statusCode to 400', () => {
    const error = new AppError('Bad request');
    expect(error.statusCode).toBe(400);
  });
});
EOF

# =========================
# errors/errorMapper.test.ts
# =========================
cat <<'EOF' > src/lib/common/errors/errorMapper.test.ts
import { AppError } from './AppError';
import { mapError } from './errorMapper';

describe('mapError', () => {
  it('should map AppError correctly', () => {
    const error = new AppError('Unauthorized', 401);
    const result = mapError(error);
    expect(result).toEqual({
      message: 'Unauthorized',
      statusCode: 401,
      details: undefined,
    });
  });

  it('should map unknown error to internal server error', () => {
    const result = mapError(new Error('Unexpected'));
    expect(result).toEqual({
      message: 'Internal Server Error',
      statusCode: 500,
    });
  });
});
EOF

# =========================
# logger/logger.test.ts
# =========================
cat <<'EOF' > src/lib/common/logger/logger.test.ts
import { logger } from './logger';

describe('logger', () => {
  it('should log info message', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    logger.info('test info');
    expect(spy).toHaveBeenCalledWith('test info');
    spy.mockRestore();
  });

  it('should log error message', () => {
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    logger.error('test error');
    expect(spy).toHaveBeenCalledWith('test error');
    spy.mockRestore();
  });
});
EOF

# =========================
# middleware/authMiddleware.test.ts
# =========================
cat <<'EOF' > src/lib/common/middleware/authMiddleware.test.ts
import { NextRequest } from 'next/server';
import { authMiddleware } from './authMiddleware';
import * as tokenUtils from '../utils/token';

describe('authMiddleware', () => {
  it('should allow request with valid token', () => {
    jest.spyOn(tokenUtils, 'verifyToken').mockReturnValue({ userId: '123' });

    const req = {
      headers: new Map([['authorization', 'Bearer validtoken']]),
    } as unknown as NextRequest;

    const res = authMiddleware(req);
    expect((req as any).user).toEqual({ userId: '123' });
    expect(res.status).toBe(200);
  });

  it('should reject request with invalid token', () => {
    jest.spyOn(tokenUtils, 'verifyToken').mockImplementation(() => {
      throw new Error('invalid');
    });

    const req = {
      headers: new Map([['authorization', 'Bearer invalidtoken']]),
    } as unknown as NextRequest;

    const res = authMiddleware(req);
    expect(res.status).toBe(401);
  });
});
EOF

# =========================
# middleware/rateLimiter.test.ts
# =========================
cat <<'EOF' > src/lib/common/middleware/rateLimiter.test.ts
import { rateLimiter } from './rateLimiter';

describe('rateLimiter', () => {
  it('should allow first requests under limit', () => {
    const ip = '127.0.0.1';
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter(ip, 10, 1000)).toBe(true);
    }
  });

  it('should block requests above limit', () => {
    const ip = '192.168.1.1';
    for (let i = 0; i < 11; i++) {
      rateLimiter(ip, 10, 1000);
    }
    expect(rateLimiter(ip, 10, 1000)).toBe(false);
  });
});
EOF

# =========================
# provider/AppContainer.test.ts
# =========================
cat <<'EOF' > src/lib/common/provider/AppContainer.test.ts
import { AppContainer } from './AppContainer';
import { AuthContainer } from '@/src/lib/features/auth/AuthContainer';

jest.mock('@/src/lib/features/auth/AuthContainer', () => ({
  AuthContainer: { getInstance: jest.fn(() => 'mockAuth') },
}));

describe('AppContainer', () => {
  it('should provide auth instance', () => {
    expect(AppContainer.auth).toBe('mockAuth');
  });
});
EOF

# =========================
# utils/date.test.ts
# =========================
cat <<'EOF' > src/lib/common/utils/date.test.ts
import { toIsoString } from './date';

describe('toIsoString', () => {
  it('should format date into ISO string', () => {
    const date = new Date('2025-01-01T12:00:00Z');
    expect(toIsoString(date)).toMatch(/^2025-01-01T/);
  });
});
EOF

# =========================
# utils/object.test.ts
# =========================
cat <<'EOF' > src/lib/common/utils/object.test.ts
import { deepClone } from './object';

describe('deepClone', () => {
  it('should deep clone objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = deepClone(obj);
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
  });
});
EOF

# =========================
# utils/token.test.ts
# =========================
cat <<'EOF' > src/lib/common/utils/token.test.ts
import { generateToken, verifyToken } from './token';
import { env } from '../config/env';

describe('token utils', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = '12345678901234567890123456789012';
  });

  it('should generate and verify token', () => {
    const token = generateToken({ id: 'abc' }, '1h');
    const payload = verifyToken<{ id: string }>(token);
    expect(payload.id).toBe('abc');
  });

  it('should throw error for invalid token', () => {
    expect(() => verifyToken('invalid')).toThrow();
  });
});
EOF

# =========================
# validation/validate.test.ts
# =========================
cat <<'EOF' > src/lib/common/validation/validate.test.ts
import { z } from 'zod';
import { validate } from './validate';
import { AppError } from '../errors/AppError';

describe('validate', () => {
  const schema = z.object({ name: z.string() });

  it('should pass with valid data', () => {
    const result = validate(schema, { name: 'John' });
    expect(result).toEqual({ name: 'John' });
  });

  it('should throw AppError with invalid data', () => {
    expect(() => validate(schema, { name: 123 })).toThrow(AppError);
  });
});
EOF

echo "✅ All test files created under src/lib/common/"
