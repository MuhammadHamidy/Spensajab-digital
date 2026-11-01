#!/bin/bash
set -e

echo "Generating Auth Infrastructure tests..."

# ----------------------
# Folder test untuk adapter
# ----------------------
ADAPTER_TEST_DIR="src/lib/features/auth/infrastructure/adapter/__tests__"
mkdir -p $ADAPTER_TEST_DIR

# BcryptService.test.ts
cat > $ADAPTER_TEST_DIR/BcryptService.test.ts << 'EOF'
import { BcryptService } from '@/lib/features/auth/infrastructure/adapter/BcryptService';
import bcrypt from 'bcryptjs';

describe('BcryptService', () => {
  let service: BcryptService;

  beforeEach(() => {
    service = new BcryptService();
  });

  it('hashes a password', async () => {
    const hash = await service.hash('password');
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe('password');
  });

  it('compares password correctly', async () => {
    const hash = await service.hash('password');
    const result = await service.compare('password', hash);
    expect(result).toBe(true);
    const wrong = await service.compare('wrong', hash);
    expect(wrong).toBe(false);
  });
});
EOF

# ----------------------
# Folder test untuk mapper
# ----------------------
MAPPER_TEST_DIR="src/lib/features/auth/infrastructure/mapper/__tests__"
mkdir -p $MAPPER_TEST_DIR

# UserMapper.test.ts
cat > $MAPPER_TEST_DIR/UserMapper.test.ts << 'EOF'
import { toPublicUser } from '@/lib/features/auth/infrastructure/mapper/UserMapper';

describe('toPublicUser', () => {
  it('maps Prisma user to public user', () => {
    const prismaUser = {
      id: '1',
      email: 'a@b.com',
      name: 'User',
      role: 'USER',
      createdAt: new Date(),
    } as any;

    const result = toPublicUser(prismaUser);
    expect(result.id).toBe(prismaUser.id);
    expect(result.email).toBe(prismaUser.email);
    expect(result.name).toBe(prismaUser.name);
    expect(result.role).toBe(prismaUser.role);
    expect(result.createdAt).toBe(prismaUser.createdAt);
  });
});
EOF

# ----------------------
# Folder test untuk persistence
# ----------------------
PERSISTENCE_TEST_DIR="src/lib/features/auth/infrastructure/persistence/__tests__"
mkdir -p $PERSISTENCE_TEST_DIR

# PrismaUserRepository.test.ts
cat > $PERSISTENCE_TEST_DIR/PrismaUserRepository.test.ts << 'EOF'
import { PrismaUserRepository } from '@/lib/features/auth/infrastructure/persistence/PrismaUserRepository';

describe('PrismaUserRepository interface', () => {
  it('should have create, findByEmail, findById methods', () => {
    const repo: PrismaUserRepository = {
      create: jest.fn() as any,
      findByEmail: jest.fn() as any,
      findById: jest.fn() as any,
    } as any;

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByEmail).toBe('function');
    expect(typeof repo.findById).toBe('function');
  });
});
EOF

# PrismaSessionRepository.test.ts
cat > $PERSISTENCE_TEST_DIR/PrismaSessionRepository.test.ts << 'EOF'
import { PrismaSessionRepository } from '@/lib/features/auth/infrastructure/persistence/PrismaSessionRepository';

describe('PrismaSessionRepository interface', () => {
  it('should have create, findByRefreshToken, revokeByToken methods', () => {
    const repo: PrismaSessionRepository = {
      create: jest.fn() as any,
      findByRefreshToken: jest.fn() as any,
      revokeByToken: jest.fn() as any,
    } as any;

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByRefreshToken).toBe('function');
    expect(typeof repo.revokeByToken).toBe('function');
  });
});
EOF

# ----------------------
# Folder test untuk TokenService
# ----------------------
TOKEN_TEST_DIR="src/lib/features/auth/infrastructure/__tests__"
mkdir -p $TOKEN_TEST_DIR

# JwtTokenService.test.ts
cat > $TOKEN_TEST_DIR/JwtTokenService.test.ts << 'EOF'
import { JwtTokenService } from '@/lib/features/auth/infrastructure/adapter/JwtTokenService';
import jwt from 'jsonwebtoken';

jest.mock('@/lib/common/config/env', () => ({ env: { JWT_SECRET: 'secret' } }));

describe('JwtTokenService', () => {
  let service: JwtTokenService;

  beforeEach(() => {
    service = new JwtTokenService();
  });

  it('signs a token', () => {
    const token = service.sign({ userId: '1' });
    expect(typeof token).toBe('string');
  });

  it('verifies a token', () => {
    const token = service.sign({ userId: '1' });
    const payload = service.verify<{ userId: string }>(token);
    expect(payload.userId).toBe('1');
  });
});
EOF

echo "Auth Infrastructure tests generated:"
echo "- Adapter tests: $ADAPTER_TEST_DIR"
echo "- Mapper tests: $MAPPER_TEST_DIR"
echo "- Persistence tests: $PERSISTENCE_TEST_DIR"
echo "- TokenService tests: $TOKEN_TEST_DIR"
echo "Run tests with: npx jest"
