import { generateToken, verifyToken } from './token';

describe('token utils', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = '12345678901234567890123456789012';
  });

  it('should generate and verify token', () => {
    const token = generateToken({ id: 'abc' }, '1h');
    const payload = verifyToken<{ id: string }>(token);
    expect(payload.id).toBe('abc');
  });

  it('should throw error for invalid token', () => {
    expect(() => verifyToken('invalid')).toThrow();
  });
});
