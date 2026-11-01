import { parseRefresh } from '@/lib/features/auth/presentation/dto/RefreshTokenDto';
import { AppError } from '@/lib/common/errors/AppError';

describe('Refresh DTO', () => {
  it('parses valid token', () => {
    const data = { refreshToken: 'longenoughtoken' };
    const result = parseRefresh(data);
    expect(result.refreshToken).toBe('longenoughtoken');
  });

  it('throws on short token', () => {
    expect(() => parseRefresh({ refreshToken: 'short' })).toThrow(AppError);
  });
});
