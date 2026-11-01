import { z } from 'zod';
import { validate } from './validate';
import { AppError } from '../errors/AppError';

describe('validate', () => {
  const schema = z.object({ name: z.string() });

  it('should pass with valid data', () => {
    const result = validate(schema, { name: 'John' });
    expect(result).toEqual({ name: 'John' });
  });

  it('should throw AppError with invalid data', () => {
    expect(() => validate(schema, { name: 123 })).toThrow(AppError);
  });
});
