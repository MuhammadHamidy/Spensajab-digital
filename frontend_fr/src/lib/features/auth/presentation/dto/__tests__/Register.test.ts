import { parseRegister } from '@/lib/features/auth/presentation/dto/RegisterRequestDto';
import { AppError } from '@/lib/common/errors/AppError';

describe('Register DTO', () => {
  it('parses valid data', () => {
    const data = { email: 'a@b.com', password: '123456', name: 'User' };
    const result = parseRegister(data);
    expect(result.name).toBe('User');
  });

  it('throws on missing email', () => {
    expect(() => parseRegister({ password: '123456' })).toThrow(AppError);
  });
});
