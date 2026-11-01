import { SessionRepository } from '../../domain/port/SessionRepository';
import { RefreshRequest } from '@/lib/features/auth/presentation/dto/RefreshTokenDto';

export class LogoutUseCase {
  constructor(private sessionRepo: SessionRepository) {}

  async execute({ refreshToken }: RefreshRequest) {
    await this.sessionRepo.revokeByToken(refreshToken);
  }
}
