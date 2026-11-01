import { NextApiRequest, NextApiResponse } from 'next';
import { JwtTokenService } from '@/lib/features/auth/infrastructure/adapter/TokenServiceJwt';
import { logger } from '@/lib/common/logger/logger';

export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const tokenService = new JwtTokenService();
  try {
    const auth = req.headers.authorization?.replace('Bearer ', '');
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }
    return tokenService.verify<{ userId: string }>(auth);
  } catch (err) {
    logger.error(err);
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}
