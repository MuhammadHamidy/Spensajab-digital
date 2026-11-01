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
