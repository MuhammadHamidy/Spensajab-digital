import { z } from 'zod';
import { validate } from '@/lib/common/validation/validate';

export const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

export function parseRegister(data: unknown): RegisterRequest {
  return validate(RegisterSchema, data);
}
