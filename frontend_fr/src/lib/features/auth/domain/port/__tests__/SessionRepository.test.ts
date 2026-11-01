import { SessionRepository } from '@/lib/features/auth/domain/port/SessionRepository';

describe('SessionRepository interface', () => {
  it('should have create, findByRefreshToken, revokeByToken methods', () => {
    const repo: SessionRepository = {
      create: jest.fn() as any,
      findByRefreshToken: jest.fn() as any,
      revokeByToken: jest.fn() as any,
    };

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByRefreshToken).toBe('function');
    expect(typeof repo.revokeByToken).toBe('function');
  });
});
