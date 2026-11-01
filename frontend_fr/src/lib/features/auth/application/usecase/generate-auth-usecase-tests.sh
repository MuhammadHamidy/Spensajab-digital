#!/bin/bash
set -e

echo "Generating Auth UseCase tests..."

# Folder test
TEST_DIR="src/lib/features/auth/application/usecase/__tests__"
mkdir -p $TEST_DIR

# ----------------------
# LoginUseCase.test.ts
# ----------------------
cat > $TEST_DIR/LoginUseCase.test.ts << 'EOF'
import { LoginUseCase } from '@/lib/features/auth/application/usecase/LoginUseCase';
import { AppError } from '@/lib/common/errors/AppError';

const mockUserRepo = { findByEmail: jest.fn() };
const mockBcrypt = { compare: jest.fn() };
const mockSessionRepo = { create: jest.fn() };
const mockTokenService = { sign: jest.fn() };

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  beforeEach(() => {
    useCase = new LoginUseCase(mockUserRepo as any, mockBcrypt as any, mockSessionRepo as any, mockTokenService as any);
  });

  it('throws if user not found', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute('a@b.com', 'pass')).rejects.toThrow(AppError);
  });

  it('throws if password invalid', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: '1', passwordHash: 'hash' });
    mockBcrypt.compare.mockResolvedValue(false);
    await expect(useCase.execute('a@b.com', 'pass')).rejects.toThrow(AppError);
  });

  it('returns tokens if credentials valid', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: '1', passwordHash: 'hash' });
    mockBcrypt.compare.mockResolvedValue(true);
    mockTokenService.sign.mockReturnValue('token');
    mockSessionRepo.create.mockResolvedValue({} as any);

    const result = await useCase.execute('a@b.com', 'pass');
    expect(result.accessToken).toBe('token');
    expect(result.refreshToken).toBe('token');
  });
});
EOF

# ----------------------
# RegisterUserUseCase.test.ts
# ----------------------
cat > $TEST_DIR/RegisterUserUseCase.test.ts << 'EOF'
import { RegisterUserUseCase } from '@/lib/features/auth/application/usecase/RegisterUserUseCase';
import { AppError } from '@/lib/common/errors/AppError';

const mockUserRepo = { findByEmail: jest.fn(), create: jest.fn() };
const mockBcrypt = { hash: jest.fn() };

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    useCase = new RegisterUserUseCase(mockUserRepo as any, mockBcrypt as any);
  });

  it('throws if email already taken', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: '1' });
    await expect(useCase.execute('a@b.com', 'pass')).rejects.toThrow(AppError);
  });

  it('creates user if email not taken', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('hashed');
    mockUserRepo.create.mockResolvedValue({ id: '1', email: 'a@b.com', name: 'User' });

    const result = await useCase.execute('a@b.com', 'pass', 'User');
    expect(result.id).toBe('1');
  });
});
EOF

# ----------------------
# RefreshTokenUseCase.test.ts
# ----------------------
cat > $TEST_DIR/RefreshTokenUseCase.test.ts << 'EOF'
import { RefreshTokenUseCase } from '@/lib/features/auth/application/usecase/RefreshTokenUseCase';
import { AppError } from '@/lib/common/errors/AppError';

const mockSessionRepo = { findByRefreshToken: jest.fn() };
const mockTokenService = { verify: jest.fn(), sign: jest.fn() };

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    useCase = new RefreshTokenUseCase(mockSessionRepo as any, mockTokenService as any);
  });

  it('throws if session not found', async () => {
    mockTokenService.verify.mockReturnValue({ userId: '1' });
    mockSessionRepo.findByRefreshToken.mockResolvedValue(null);
    await expect(useCase.execute('token')).rejects.toThrow(AppError);
  });

  it('returns access token if valid', async () => {
    mockTokenService.verify.mockReturnValue({ userId: '1' });
    mockSessionRepo.findByRefreshToken.mockResolvedValue({ userId: '1', expiresAt: new Date(Date.now() + 1000) });
    mockTokenService.sign.mockReturnValue('accessToken');

    const result = await useCase.execute('token');
    expect(result.accessToken).toBe('accessToken');
  });
});
EOF

# ----------------------
# LogoutUseCase.test.ts
# ----------------------
cat > $TEST_DIR/LogoutUseCase.test.ts << 'EOF'
import { LogoutUseCase } from '@/lib/features/auth/application/usecase/LogoutUseCase';

const mockSessionRepo = { revokeByToken: jest.fn() };

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  beforeEach(() => {
    useCase = new LogoutUseCase(mockSessionRepo as any);
  });

  it('calls revokeByToken', async () => {
    await useCase.execute('token');
    expect(mockSessionRepo.revokeByToken).toHaveBeenCalledWith('token');
  });
});
EOF

echo "Auth UseCase tests generated in $TEST_DIR"
echo "Run tests with: npx jest"
