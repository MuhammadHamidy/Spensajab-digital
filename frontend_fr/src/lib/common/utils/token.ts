import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

// Generate a JWT token
export function generateToken(payload: object, expiresIn: string | number = '1h'): string {
  return jwt.sign(payload, env.JWT_SECRET as string, { expiresIn } as SignOptions);
}

// Verify a JWT token
export function verifyToken<T>(token: string): T {
  return jwt.verify(token, env.JWT_SECRET as string) as T;
}
