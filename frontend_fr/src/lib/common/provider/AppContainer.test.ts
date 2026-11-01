import { AppContainer } from './AppContainer';

jest.mock('../../features/auth/AuthContainer', () => ({
  AuthContainer: { getInstance: jest.fn(() => 'mockAuth') },
}));

describe('AppContainer', () => {
  it('should provide auth instance', () => {
    expect(AppContainer.auth).toBe('mockAuth');
  });
});
