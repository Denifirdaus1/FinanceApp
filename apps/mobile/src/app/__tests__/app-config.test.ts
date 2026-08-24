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
