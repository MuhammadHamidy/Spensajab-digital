import { Session } from '@/generated/prisma';

export interface SessionRepository {
  create(userId: string, refreshToken: string, expiresAt: Date): Promise<Session>;

  findByRefreshToken(token: string): Promise<Session | null>;

  revokeByToken(token: string): Promise<void>;
}
