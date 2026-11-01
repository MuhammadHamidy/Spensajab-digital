import { BcryptService } from '@/lib/features/auth/infrastructure/adapter/BcryptService';

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
