import { getE2eSessionOverride } from './e2e-session-override';

const mockExpoConfig: { extra?: { e2eSessionOverride?: string } } = {};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

function setDev(value: boolean): void {
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = value;
}

describe('e2e session override', () => {
  beforeEach(() => {
    setDev(true);
    delete mockExpoConfig.extra;
  });

  afterEach(() => {
    setDev(true);
  });

  it('maps a signedIn override to an authenticated state in development', () => {
    mockExpoConfig.extra = { e2eSessionOverride: 'signedIn' };
    expect(getE2eSessionOverride()).toEqual({
      status: 'signedIn',
      user: { id: 'e2e-user', displayName: 'Pengguna Uji' },
      offline: false,
    });
  });

  it('maps non-authenticated overrides in development', () => {
    mockExpoConfig.extra = { e2eSessionOverride: 'revoked' };
    expect(getE2eSessionOverride()?.status).toBe('revoked');
    mockExpoConfig.extra = { e2eSessionOverride: 'signedOut' };
    expect(getE2eSessionOverride()?.status).toBe('signedOut');
    mockExpoConfig.extra = { e2eSessionOverride: 'error' };
    expect(getE2eSessionOverride()?.status).toBe('error');
  });

  it('ignores unknown or missing overrides', () => {
    mockExpoConfig.extra = { e2eSessionOverride: 'admin' };
    expect(getE2eSessionOverride()).toBeNull();
    expect(getE2eSessionOverride()).toBeNull();
  });

  it('never applies any override outside development builds', () => {
    mockExpoConfig.extra = { e2eSessionOverride: 'signedIn' };
    setDev(false);
    expect(getE2eSessionOverride()).toBeNull();
    mockExpoConfig.extra = { e2eSessionOverride: 'revoked' };
    expect(getE2eSessionOverride()).toBeNull();
  });
});
