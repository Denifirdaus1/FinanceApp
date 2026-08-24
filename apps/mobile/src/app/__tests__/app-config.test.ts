import appConfig from '../../../app.config';

const ENV_KEYS = [
  'EXPO_PUBLIC_APP_ENV',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_EAS_UPDATE_CHANNEL',
  'E2E_SESSION_OVERRIDE',
];

const DEV_ENV = {
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_config-test-key-0000000000000000',
  EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'development',
};

function setEnv(values: Record<string, string>): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
}

function clearEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe('app config environment boundary', () => {
  afterEach(() => {
    clearEnv();
  });

  it('embeds the e2e session override in development builds', () => {
    setEnv({ ...DEV_ENV, E2E_SESSION_OVERRIDE: 'signedIn' });
    const config = appConfig();
    expect(config.extra?.appEnv).toBe('development');
    expect(config.extra?.e2eSessionOverride).toBe('signedIn');
  });

  it('leaves the override undefined in development when unset', () => {
    setEnv(DEV_ENV);
    const config = appConfig();
    expect(config.extra?.appEnv).toBe('development');
    expect(config.extra?.e2eSessionOverride).toBeUndefined();
  });

  it('uses an isolated development app identity and exact auth callback', () => {
    setEnv(DEV_ENV);
    const config = appConfig();
    expect(config.scheme).toBe('financeapp-dev');
    expect(config.android?.package).toBe('id.financeapp.mobile.dev');
    expect(config.ios?.bundleIdentifier).toBe('id.financeapp.mobile.dev');
    expect(config.extra?.authRedirectUrl).toBe('financeapp-dev://auth/callback');
  });

  it('never embeds the override in preview builds', () => {
    setEnv({
      EXPO_PUBLIC_APP_ENV: 'preview',
      EXPO_PUBLIC_SUPABASE_URL: 'https://preview.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_config-test-key-0000000000000000',
      EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'preview',
      E2E_SESSION_OVERRIDE: 'signedIn',
    });
    const config = appConfig();
    expect(config.extra?.appEnv).toBe('preview');
    expect(config.extra?.e2eSessionOverride).toBeUndefined();
    expect(config.scheme).toBe('financeapp-preview');
    expect(config.android?.package).toBe('id.financeapp.mobile.preview');
    expect(config.ios?.bundleIdentifier).toBe('id.financeapp.mobile.preview');
    expect(config.extra?.authRedirectUrl).toBe('financeapp-preview://auth/callback');
  });

  it('never embeds the override in production builds', () => {
    setEnv({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_SUPABASE_URL: 'https://production.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_config-test-key-0000000000000000',
      EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'production',
      E2E_SESSION_OVERRIDE: 'signedIn',
    });
    const config = appConfig();
    expect(config.extra?.appEnv).toBe('production');
    expect(config.extra?.e2eSessionOverride).toBeUndefined();
    expect(config.scheme).toBe('financeapp');
    expect(config.android?.package).toBe('id.financeapp.mobile');
    expect(config.ios?.bundleIdentifier).toBe('id.financeapp.mobile');
    expect(config.extra?.authRedirectUrl).toBe('financeapp://auth/callback');
  });

  it('keeps the development client off OTA while enabling Apple Sign-In on iOS', () => {
    setEnv(DEV_ENV);
    const config = appConfig();
    expect(config.owner).toBe('denifirdaus');
    expect(config.runtimeVersion).toBeUndefined();
    expect(config.updates).toMatchObject({
      enabled: false,
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
    });
    expect(config.updates?.url).toBeUndefined();
    expect(config.extra?.eas).toEqual({
      projectId: 'de64cde1-0152-4944-9f4d-0350b2b3bdf0',
    });
    expect(config.ios?.usesAppleSignIn).toBe(true);
    expect(config.ios?.config?.usesNonExemptEncryption).toBe(false);
    expect(config.plugins).toContain('expo-apple-authentication');
  });

  it('binds preview and production OTA updates to the native fingerprint', () => {
    setEnv({
      EXPO_PUBLIC_APP_ENV: 'preview',
      EXPO_PUBLIC_SUPABASE_URL: 'https://preview.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_config-test-key-0000000000000000',
      EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'preview',
    });
    const config = appConfig();
    expect(config.runtimeVersion).toEqual({ policy: 'fingerprint' });
    expect(config.updates).toMatchObject({
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/de64cde1-0152-4944-9f4d-0350b2b3bdf0',
    });
  });

  it('fails closed when production environment is invalid', () => {
    setEnv({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_SUPABASE_URL: 'http://not-localhost.example.com',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_config-test-key-0000000000000000',
      EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'production',
    });
    expect(() => appConfig()).toThrow();
  });

  it('fails closed when preview environment is invalid', () => {
    setEnv({
      EXPO_PUBLIC_APP_ENV: 'preview',
      EXPO_PUBLIC_SUPABASE_URL: 'http://not-localhost.example.com',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_config-test-key-0000000000000000',
      EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'preview',
    });
    expect(() => appConfig()).toThrow();
  });
});
