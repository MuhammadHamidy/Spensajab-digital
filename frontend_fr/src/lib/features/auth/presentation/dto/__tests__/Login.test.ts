import { parseLogin } from '@/lib/features/auth/presentation/dto/LoginRequestDto';
import { AppError } from '@/lib/common/errors/AppError';

describe('Login DTO', () => {
  it('parses valid data', () => {
    const data = { email: 'a@b.com', password: '123456' };
    const result = parseLogin(data);
    expect(result.email).toBe('a@b.com');
  });

  it('throws on invalid email', () => {
    expect(() => parseLogin({ email: 'invalid', password: '123456' })).toThrow(AppError);
  });

  it('throws on short password', () => {
    expect(() => parseLogin({ email: 'a@b.com', password: '123' })).toThrow(AppError);
  });
});
