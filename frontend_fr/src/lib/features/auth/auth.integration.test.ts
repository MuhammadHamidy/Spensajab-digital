import prisma from '@/lib/common/database/PrismaClient';
import { RegisterUserUseCase } from './application/usecase/RegisterUserUseCase';
import { LoginUseCase } from './application/usecase/LoginUseCase';
import { RefreshTokenUseCase } from './application/usecase/RefreshTokenUseCase';
import { LogoutUseCase } from './application/usecase/LogoutUseCase';
import { BcryptService } from './infrastructure/adapter/BcryptService';
import { PrismaUserRepository } from './infrastructure/adapter/UserRepositoryPrisma';
import { PrismaSessionRepository } from './infrastructure/adapter/SessionRepositoryPrisma';
import { JwtTokenService } from './infrastructure/adapter/TokenServiceJwt';
import jwt from 'jsonwebtoken';

describe('Auth Full Integration', () => {
  let userRepo: PrismaUserRepository;
  let sessionRepo: PrismaSessionRepository;
  let bcryptService: BcryptService;
  let tokenService: JwtTokenService;

  let registerUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUseCase;
  let refreshUseCase: RefreshTokenUseCase;
  let logoutUseCase: LogoutUseCase;

  beforeAll(async () => {
    await prisma.$connect();

    userRepo = new PrismaUserRepository();
    sessionRepo = new PrismaSessionRepository();
    bcryptService = new BcryptService();
    tokenService = new JwtTokenService();

    registerUseCase = new RegisterUserUseCase(userRepo, bcryptService);
    loginUseCase = new LoginUseCase(userRepo, bcryptService, sessionRepo, tokenService);
    refreshUseCase = new RefreshTokenUseCase(sessionRepo, tokenService);
    logoutUseCase = new LogoutUseCase(sessionRepo);
  });

  beforeEach(async () => {
    // Bersihkan DB sebelum tiap test
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Bersihkan DB setelah semua test
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it('register → login → refresh → logout flow', async () => {
    // 1️⃣ Register
    const user = await registerUseCase.execute({
      email: 'test@example.com',
      password: 'password',
    });

    expect(user).toHaveProperty('id');
    expect(user.email).toBe('test@example.com');

    // 2️⃣ Login
    const loginResult = await loginUseCase.execute({
      email: 'test@example.com',
      password: 'password',
    });

    expect(loginResult).toHaveProperty('accessToken');
    expect(loginResult).toHaveProperty('refreshToken');

    const { accessToken, refreshToken } = loginResult;

    // 3️⃣ Refresh
    await new Promise((res) => setTimeout(res, 1000));

    const refreshed = await refreshUseCase.execute({ refreshToken });
    expect(refreshed).toHaveProperty('accessToken');

    // Bandingkan payload JWT, bukan string
    const decodedOld = jwt.decode(accessToken) as any;
    const decodedNew = jwt.decode(refreshed.accessToken) as any;
    expect(decodedNew.iat).toBeGreaterThan(decodedOld.iat);

    // 4️⃣ Logout
    await logoutUseCase.execute({ refreshToken });

    // Pastikan session dihapus
    const session = await prisma.session.findUnique({
      where: { refreshToken: refreshToken },
    });
    expect(session).toBeNull();
  });

  it('login gagal jika password salah', async () => {
    await registerUseCase.execute({
      email: 'fail@example.com',
      password: 'correct',
    });

    await expect(
      loginUseCase.execute({ email: 'fail@example.com', password: 'wrong' })
    ).rejects.toThrow('Invalid credentials');
  });
});
