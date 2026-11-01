import prisma from '@/lib/common/database/PrismaClient';
import { SessionRepository } from '@/lib/features/auth/domain/port/SessionRepository';
import { Session } from '@/generated/prisma';

export class PrismaSessionRepository implements SessionRepository {
  async create(userId: string, refreshToken: string, expiresAt: Date): Promise<Session> {
    return prisma.session.create({ data: { userId, refreshToken, expiresAt } });
  }

  async findByRefreshToken(token: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { refreshToken: token } });
  }

  async revokeByToken(refreshToken: string): Promise<void> {
    await prisma.session.delete({ where: { refreshToken } });
  }
}
