import { LogoutUseCase } from '@/lib/features/auth/application/usecase/LogoutUseCase';

const mockSessionRepo = { revokeByToken: jest.fn() };

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  beforeEach(() => {
    useCase = new LogoutUseCase(mockSessionRepo as any);
  });

  it('calls revokeByToken', async () => {
    await useCase.execute({ refreshToken: 'token' });
    expect(mockSessionRepo.revokeByToken).toHaveBeenCalledWith('token');
  });
});
