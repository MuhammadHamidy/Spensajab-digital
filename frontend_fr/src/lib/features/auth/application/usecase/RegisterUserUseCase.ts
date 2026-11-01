import { UserRepository } from '../../domain/port/UserRepository';
import { BcryptService } from '../../infrastructure/adapter/BcryptService';
import { AuthDomainService } from '../../domain/service/AuthDomainService';
import { RegisterRequest } from '@/lib/features/auth/presentation/dto/RegisterRequestDto';

export class RegisterUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private bcrypt: BcryptService
  ) {}

  async execute({ email, password, name }: RegisterRequest) {
    const domainService = new AuthDomainService(this.userRepo);
    await domainService.ensureEmailNotTaken(email);

    const hash = await this.bcrypt.hash(password);
    const user = await this.userRepo.create(email, hash, name);
    return { id: user.id, email: user.email, name: user.name };
  }
}
