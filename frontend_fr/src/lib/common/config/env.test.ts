describe('env config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should parse environment variables correctly', () => {
    process.env.DATABASE_URL = 'http://localhost:5432/db';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.NODE_ENV = 'development';

    const validated = require('./env').env;
    expect(validated.DATABASE_URL).toBe('http://localhost:5432/db');
    expect(validated.JWT_SECRET).toBe('12345678901234567890123456789012');
    expect(validated.NODE_ENV).toBe('development');
  });

  it('should throw error if JWT_SECRET is too short', () => {
    process.env.DATABASE_URL = 'http://localhost:5432/db';
    process.env.JWT_SECRET = 'short';
    process.env.NODE_ENV = 'development';

    expect(() => require('./env')).toThrow();
  });
});
