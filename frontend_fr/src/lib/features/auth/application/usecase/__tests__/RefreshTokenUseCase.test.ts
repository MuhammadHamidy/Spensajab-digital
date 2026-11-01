import { RefreshTokenUseCase } from '@/lib/features/auth/application/usecase/RefreshTokenUseCase';
import { AppError } from '@/lib/common/errors/AppError';

// 🔹 Mock logger supaya Jest tidak nge-parse winston
jest.mock('@/lib/common/logger/logger', () => ({
  logger: { error: jest.fn() },
}));

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

  it('throws if token userId tidak sesuai session', async () => {
    mockTokenService.verify.mockReturnValue({ userId: '2' });
    mockSessionRepo.findByRefreshToken.mockResolvedValue({
      userId: '1',
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(useCase.execute('token')).rejects.toThrow(AppError);
  });

  it('throws if refresh token expired', async () => {
    mockTokenService.verify.mockReturnValue({ userId: '1' });
    mockSessionRepo.findByRefreshToken.mockResolvedValue({
      userId: '1',
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(useCase.execute('token')).rejects.toThrow(AppError);
  });

  it('returns access token if valid', async () => {
    mockTokenService.verify.mockReturnValue({ userId: '1' });
    mockSessionRepo.findByRefreshToken.mockResolvedValue({
      userId: '1',
      expiresAt: new Date(Date.now() + 1000),
    });
    mockTokenService.sign.mockReturnValue('accessToken');

    const result = await useCase.execute('token');
    expect(result.accessToken).toBe('accessToken');
  });
});
