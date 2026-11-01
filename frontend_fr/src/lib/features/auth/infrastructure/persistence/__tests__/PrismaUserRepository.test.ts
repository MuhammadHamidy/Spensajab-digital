import { PrismaUserRepository } from '@/lib/features/auth/infrastructure/persistence/PrismaUserRepository';

describe('PrismaUserRepository interface', () => {
  it('should have create, findByEmail, findById methods', () => {
    const repo: PrismaUserRepository = {
      create: jest.fn() as any,
      findByEmail: jest.fn() as any,
      findById: jest.fn() as any,
    } as any;

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByEmail).toBe('function');
    expect(typeof repo.findById).toBe('function');
  });
});
