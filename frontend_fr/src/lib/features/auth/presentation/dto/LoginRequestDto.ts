import { z } from 'zod';
import { validate } from '@/lib/common/validation/validate';

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof LoginSchema>;
export function parseLogin(data: unknown): LoginRequest {
  return validate(LoginSchema, data);
}
