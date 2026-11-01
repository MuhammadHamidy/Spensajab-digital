#!/bin/bash
set -e

echo "Generating Auth Domain tests..."

# ----------------------
# Folder test untuk service
# ----------------------
SERVICE_TEST_DIR="src/lib/features/auth/domain/service/__tests__"
mkdir -p $SERVICE_TEST_DIR

# AuthDomainService.test.ts
cat > $SERVICE_TEST_DIR/AuthDomainService.test.ts << 'EOF'
import { AuthDomainService } from '@/lib/features/auth/domain/service/AuthDomainService';
import { AppError } from '@/lib/common/errors/AppError';

const mockUserRepo = { findByEmail: jest.fn() };

describe('AuthDomainService', () => {
  let service: AuthDomainService;

  beforeEach(() => {
    service = new AuthDomainService(mockUserRepo as any);
  });

  it('throws if email already exists', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
    await expect(service.ensureEmailNotTaken('a@b.com')).rejects.toThrow(AppError);
  });

  it('does not throw if email is available', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    await expect(service.ensureEmailNotTaken('new@b.com')).resolves.toBeUndefined();
  });
});
EOF

# ----------------------
# Folder test untuk port
# ----------------------
PORT_TEST_DIR="src/lib/features/auth/domain/port/__tests__"
mkdir -p $PORT_TEST_DIR

# UserRepository.test.ts
cat > $PORT_TEST_DIR/UserRepository.test.ts << 'EOF'
import { UserRepository } from '@/lib/features/auth/domain/port/UserRepository';

describe('UserRepository interface', () => {
  it('should have create, findByEmail, findById methods', () => {
    const repo: UserRepository = {
      create: jest.fn() as any,
      findByEmail: jest.fn() as any,
      findById: jest.fn() as any,
    };

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByEmail).toBe('function');
    expect(typeof repo.findById).toBe('function');
  });
});
EOF

# SessionRepository.test.ts
cat > $PORT_TEST_DIR/SessionRepository.test.ts << 'EOF'
import { SessionRepository } from '@/lib/features/auth/domain/port/SessionRepository';

describe('SessionRepository interface', () => {
  it('should have create, findByRefreshToken, revokeByToken methods', () => {
    const repo: SessionRepository = {
      create: jest.fn() as any,
      findByRefreshToken: jest.fn() as any,
      revokeByToken: jest.fn() as any,
    };

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByRefreshToken).toBe('function');
    expect(typeof repo.revokeByToken).toBe('function');
  });
});
EOF

# TokenService.test.ts
cat > $PORT_TEST_DIR/TokenService.test.ts << 'EOF'
import { TokenService } from '@/lib/features/auth/domain/port/TokenService';

describe('TokenService interface', () => {
  it('should have sign and verify methods', () => {
    const service: TokenService = {
      sign: jest.fn() as any,
      verify: jest.fn() as any,
    };

    expect(typeof service.sign).toBe('function');
    expect(typeof service.verify).toBe('function');
  });
});
EOF

echo "Auth Domain tests generated:"
echo "- Service tests: $SERVICE_TEST_DIR"
echo "- Port tests: $PORT_TEST_DIR"
echo "Run tests with: npx jest"
