import { toPublicUser } from '@/lib/features/auth/infrastructure/mapper/UserMapper';

describe('toPublicUser', () => {
  it('maps Prisma user to public user', () => {
    const prismaUser = {
      id: '1',
      email: 'a@b.com',
      name: 'User',
      role: 'USER',
      createdAt: new Date(),
    } as any;

    const result = toPublicUser(prismaUser);
    expect(result.id).toBe(prismaUser.id);
    expect(result.email).toBe(prismaUser.email);
    expect(result.name).toBe(prismaUser.name);
    expect(result.role).toBe(prismaUser.role);
    expect(result.createdAt).toBe(prismaUser.createdAt);
  });
});
