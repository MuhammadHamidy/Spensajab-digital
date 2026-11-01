import { ZodError, ZodSchema } from 'zod';
import { AppError } from '../errors/AppError';

// Generic function to validate input against Zod schema
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError('Validation failed', 422, err.issues);
    }
    throw err;
  }
}
