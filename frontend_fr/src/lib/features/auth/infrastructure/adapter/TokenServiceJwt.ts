import { TokenService } from '@/lib/features/auth/domain/port/TokenService';
import { env } from '@/lib/common/config/env';
import jwt, { SignOptions } from 'jsonwebtoken';

export class JwtTokenService implements TokenService {
  sign(payload: object, options: SignOptions = { expiresIn: '1h' }): string {
    // Biarkan jsonwebtoken yang handle iat secara otomatis
    return jwt.sign(payload, env.JWT_SECRET as string, options);
  }

  verify<T>(token: string): T {
    return jwt.verify(token, env.JWT_SECRET as string) as T;
  }
}
