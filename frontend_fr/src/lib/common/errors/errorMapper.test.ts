import { AppError } from './AppError';
import { mapError } from './errorMapper';

describe('mapError', () => {
  it('should map AppError correctly', () => {
    const error = new AppError('Unauthorized', 401);
    const result = mapError(error);
    expect(result).toEqual({
      message: 'Unauthorized',
      statusCode: 401,
      details: undefined,
    });
  });

  it('should map unknown error to internal server error', () => {
    const result = mapError(new Error('Unexpected'));
    expect(result).toEqual({
      message: 'Internal Server Error',
      statusCode: 500,
    });
  });
});
