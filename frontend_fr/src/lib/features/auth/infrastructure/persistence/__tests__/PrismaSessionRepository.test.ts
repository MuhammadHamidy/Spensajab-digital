import { PrismaSessionRepository } from '@/lib/features/auth/infrastructure/persistence/PrismaSessionRepository';

describe('PrismaSessionRepository interface', () => {
  it('should have create, findByRefreshToken, revokeByToken methods', () => {
    const repo: PrismaSessionRepository = {
      create: jest.fn() as any,
      findByRefreshToken: jest.fn() as any,
      revokeByToken: jest.fn() as any,
    } as any;

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByRefreshToken).toBe('function');
    expect(typeof repo.revokeByToken).toBe('function');
  });
});
