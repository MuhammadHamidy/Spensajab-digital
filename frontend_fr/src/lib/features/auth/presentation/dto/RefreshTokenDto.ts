import { z } from 'zod';
import { validate } from '@/lib/common/validation/validate';

export const RefreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export type RefreshRequest = z.infer<typeof RefreshSchema>;
export function parseRefresh(data: unknown): RefreshRequest {
  return validate(RefreshSchema, data);
}
