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
