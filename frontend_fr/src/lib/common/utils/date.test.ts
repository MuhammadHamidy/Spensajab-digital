import { toIsoString } from './date';

describe('toIsoString', () => {
  it('should format date into ISO string', () => {
    const date = new Date('2025-01-01T12:00:00Z');
    expect(toIsoString(date)).toMatch(/^2025-01-01T/);
  });
});
