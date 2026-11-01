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
