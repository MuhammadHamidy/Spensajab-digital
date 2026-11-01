import { UserRepository } from '@/lib/features/auth/domain/port/UserRepository';

describe('UserRepository interface', () => {
  it('should have create, findByEmail, findById methods', () => {
    const repo: UserRepository = {
      create: jest.fn() as any,
      findByEmail: jest.fn() as any,
      findById: jest.fn() as any,
    };

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByEmail).toBe('function');
    expect(typeof repo.findById).toBe('function');
  });
});
