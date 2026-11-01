import { z } from 'zod';

// Define schema for environment variables
const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);
