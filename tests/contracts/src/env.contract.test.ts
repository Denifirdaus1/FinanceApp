import { EnvValidationError, parseEnv } from '@financeapp/config';
import type { PublicEnvConfig } from '@financeapp/config';

const validDev = {
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_contract-test-key-0000000000000000',
  EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'development',
};

describe('environment contract', () => {
  it('accepts the documented .env.example shape and nothing more', () => {
    const config: PublicEnvConfig = parseEnv(validDev);
    expect(config).toEqual({
      appEnv: 'development',
      supabaseUrl: 'http://localhost:54321',
      supabaseAnonKey: 'sb_publishable_contract-test-key-0000000000000000',
      easUpdateChannel: 'development',
    });
    expect(Object.keys(config).sort()).toEqual([
      'appEnv',
      'easUpdateChannel',
      'supabaseAnonKey',
      'supabaseUrl',
    ]);
  });

  it('accepts https production-shaped values', () => {
    const config = parseEnv({
      ...validDev,
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'production',
    });
    expect(config.appEnv).toBe('production');
  });

  it('rejects service-role and secret keys under every environment', () => {
    for (const env of ['development', 'preview', 'production']) {
      expect(() =>
        parseEnv({
          ...validDev,
          EXPO_PUBLIC_APP_ENV: env,
          EXPO_PUBLIC_EAS_UPDATE_CHANNEL: env,
          EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_contract-test-key-0000000000000000',
        }),
      ).toThrow(EnvValidationError);
    }
  });

  it('rejects http for non-localhost in every environment', () => {
    for (const env of ['development', 'preview', 'production']) {
      expect(() =>
        parseEnv({
          ...validDev,
          EXPO_PUBLIC_APP_ENV: env,
          EXPO_PUBLIC_EAS_UPDATE_CHANNEL: env,
          EXPO_PUBLIC_SUPABASE_URL: 'http://example.com',
        }),
      ).toThrow(EnvValidationError);
    }
  });
});
