// src/lib/features/auth/domain/port/TokenService.ts
import { SignOptions } from 'jsonwebtoken';

export interface TokenService {
  sign(payload: object, options?: SignOptions): string;
  verify<T>(token: string): T;
}
