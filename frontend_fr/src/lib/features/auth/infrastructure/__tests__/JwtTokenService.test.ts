import { JwtTokenService } from '@/lib/features/auth/infrastructure/adapter/TokenServiceJwt';

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
