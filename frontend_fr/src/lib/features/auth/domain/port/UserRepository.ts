import { User } from '@/generated/prisma';

// Port: abstraction for user persistence
export interface UserRepository {
  create(email: string, passwordHash: string, name?: string): Promise<User>;

  findByEmail(email: string): Promise<User | null>;

  findById(id: string): Promise<User | null>;
}
