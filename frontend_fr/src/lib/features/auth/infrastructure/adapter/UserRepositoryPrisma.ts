import prisma from '@/lib/common/database/PrismaClient';
import { UserRepository } from '@/lib/features/auth/domain/port/UserRepository';
import { User } from '@/generated/prisma';

export class PrismaUserRepository implements UserRepository {
  async create(email: string, passwordHash: string, name?: string): Promise<User> {
    return prisma.user.create({ data: { email, passwordHash, name } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }
}
