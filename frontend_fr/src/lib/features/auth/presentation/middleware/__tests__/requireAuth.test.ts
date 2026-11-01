import { JwtTokenService } from '@/lib/features/auth/infrastructure/adapter/TokenServiceJwt';
import { requireAuth } from '@/lib/features/auth/presentation/middleware/AuthMiddleware';

jest.mock('@/lib/features/auth/infrastructure/adapter/TokenServiceJwt');

describe('requireAuth middleware', () => {
  let req: any;
  let res: any;
  const jsonMock = jest.fn();
  const statusMock = jest.fn(() => ({ json: jsonMock }));

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = { status: statusMock };
  });

  it('returns null if no auth header', async () => {
    const result = await requireAuth(req, res);
    expect(result).toBeNull();
    expect(statusMock).toHaveBeenCalledWith(401);
  });

  it('calls token verify if header present', async () => {
    const verifyMock = jest.fn().mockReturnValue({ userId: '1' });
    (JwtTokenService as jest.Mock).mockImplementation(() => ({ verify: verifyMock }));
    req.headers.authorization = 'Bearer token';

    const result = await requireAuth(req, res);
    expect(result).toEqual({ userId: '1' });
    expect(verifyMock).toHaveBeenCalledWith('token');
  });

  it('returns null if verify throws', async () => {
    const verifyMock = jest.fn(() => {
      throw new Error('fail');
    });
    (JwtTokenService as jest.Mock).mockImplementation(() => ({ verify: verifyMock }));
    req.headers.authorization = 'Bearer token';

    const result = await requireAuth(req, res);
    expect(result).toBeNull();
    expect(statusMock).toHaveBeenCalledWith(401);
  });
});
