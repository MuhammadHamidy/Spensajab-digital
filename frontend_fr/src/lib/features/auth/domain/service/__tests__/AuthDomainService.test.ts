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
