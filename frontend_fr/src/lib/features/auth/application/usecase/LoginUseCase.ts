import { UserRepository } from '../../domain/port/UserRepository';
import { BcryptService } from '../../infrastructure/adapter/BcryptService';
import { SessionRepository } from '../../domain/port/SessionRepository';
import { TokenService } from '../../domain/port/TokenService';
import { AppError } from '@/lib/common/errors/AppError';
import { toPublicUser } from '../../infrastructure/mapper/UserMapper';
import { LoginRequest } from '@/lib/features/auth/presentation/dto/LoginRequestDto';

export class LoginUseCase {
  constructor(
    private userRepo: UserRepository,
    private bcrypt: BcryptService,
    private sessionRepo: SessionRepository,
    private tokenService: TokenService
  ) {}

  async execute({ email, password }: LoginRequest) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await this.bcrypt.compare(
      password,
      (user as any).passwordHash ?? (user as any).password
    );
    if (!valid) throw new AppError('Invalid credentials', 401);

    // access token
    const accessToken = this.tokenService.sign({ userId: user.id }, { expiresIn: '15m' });
    // refresh token
    const refreshToken = this.tokenService.sign(
      { session: true, userId: user.id },
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await this.sessionRepo.create(user.id, refreshToken, expiresAt);

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
      expiresAt,
    };
  }
}
