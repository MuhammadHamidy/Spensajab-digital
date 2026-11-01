import { rateLimiter } from './rateLimiter';

describe('rateLimiter', () => {
  it('should allow first requests under limit', () => {
    const ip = '127.0.0.1';
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter(ip, 10, 1000)).toBe(true);
    }
  });

  it('should block requests above limit', () => {
    const ip = '192.168.1.1';
    for (let i = 0; i < 11; i++) {
      rateLimiter(ip, 10, 1000);
    }
    expect(rateLimiter(ip, 10, 1000)).toBe(false);
  });
});
