import { AppError } from './AppError';

describe('AppError', () => {
  it('should set message, statusCode, and details', () => {
    const error = new AppError('Not Found', 404, { resource: 'User' });
    expect(error.message).toBe('Not Found');
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ resource: 'User' });
  });

  it('should default statusCode to 400', () => {
    const error = new AppError('Bad request');
    expect(error.statusCode).toBe(400);
  });
});
