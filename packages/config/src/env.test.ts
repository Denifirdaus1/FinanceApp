import { APP_ENV_VALUES, EnvValidationError, loadEnv, parseEnv } from './env';

function jwt(role: string): string {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ role })}.fakesignature`;
}

const validDev = {
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'),
  EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'development',
};

const validPreview = {
  ...validDev,
  EXPO_PUBLIC_APP_ENV: 'preview',
  EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'preview',
};

const validProduction = {
  ...validDev,
  EXPO_PUBLIC_APP_ENV: 'production',
  EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'production',
};

function expectEnvError(
  source: Record<string, string | undefined>,
  path: string,
): EnvValidationError {
  try {
    parseEnv(source);
  } catch (error) {
    expect(error).toBeInstanceOf(EnvValidationError);
    const envError = error as EnvValidationError;
    expect(envError.issues.some((issue) => issue.path === path)).toBe(true);
    return envError;
  }
  throw new Error(`expected parseEnv to throw with an issue at ${path}`);
}

describe('environment validation', () => {
  it('parses a valid development environment into typed public config', () => {
    const config = parseEnv(validDev);
    expect(config).toEqual({
      appEnv: 'development',
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: jwt('anon'),
      easUpdateChannel: 'development',
    });
  });

  it('accepts http for localhost in development', () => {
    expect(
      parseEnv({ ...validDev, EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321' }).supabaseUrl,
    ).toBe('http://localhost:54321');
    expect(
      parseEnv({ ...validDev, EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' }).supabaseUrl,
    ).toBe('http://127.0.0.1:54321');
  });

  it('rejects http for non-localhost hosts in development', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_URL: 'http://example.com' },
      'EXPO_PUBLIC_SUPABASE_URL',
    );
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_URL: 'http://supabase.co' },
      'EXPO_PUBLIC_SUPABASE_URL',
    );
  });

  it('rejects http in preview even for localhost (HTTPS required)', () => {
    expectEnvError(
      { ...validPreview, EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321' },
      'EXPO_PUBLIC_SUPABASE_URL',
    );
  });

  it('rejects http in production even for localhost (HTTPS required)', () => {
    expectEnvError(
      { ...validProduction, EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321' },
      'EXPO_PUBLIC_SUPABASE_URL',
    );
  });

  it('accepts https in preview and production', () => {
    expect(parseEnv(validPreview).appEnv).toBe('preview');
    expect(parseEnv(validProduction).appEnv).toBe('production');
  });

  it('rejects a missing supabase URL', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_URL: undefined },
      'EXPO_PUBLIC_SUPABASE_URL',
    );
  });

  it('rejects a malformed supabase URL', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_URL: 'not-a-url' },
      'EXPO_PUBLIC_SUPABASE_URL',
    );
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_URL: 'ftp://example.com' },
      'EXPO_PUBLIC_SUPABASE_URL',
    );
  });

  it('rejects a missing supabase anon key', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined },
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  });

  it('rejects a malformed supabase anon key', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'short' },
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'supabase-anonymous' },
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  });

  it('rejects a service-role JWT as the anon key', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt('service_role') },
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  });

  it('rejects a sb_secret_ key as the anon key', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_publishable-lookalike-123' },
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  });

  it('accepts a sb_publishable_ key as the anon key', () => {
    expect(
      parseEnv({ ...validDev, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_x'.padEnd(60, 'a') })
        .supabaseAnonKey,
    ).toBe('sb_publishable_x'.padEnd(60, 'a'));
  });

  it('rejects an APP_ENV outside development|preview|production', () => {
    expectEnvError({ ...validDev, EXPO_PUBLIC_APP_ENV: 'staging' }, 'EXPO_PUBLIC_APP_ENV');
    expectEnvError({ ...validDev, EXPO_PUBLIC_APP_ENV: 'dev' }, 'EXPO_PUBLIC_APP_ENV');
  });

  it('rejects a missing APP_ENV', () => {
    expectEnvError({ ...validDev, EXPO_PUBLIC_APP_ENV: undefined }, 'EXPO_PUBLIC_APP_ENV');
  });

  it('requires the EAS update channel to match APP_ENV', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'production' },
      'EXPO_PUBLIC_EAS_UPDATE_CHANNEL',
    );
    expectEnvError(
      { ...validPreview, EXPO_PUBLIC_EAS_UPDATE_CHANNEL: 'development' },
      'EXPO_PUBLIC_EAS_UPDATE_CHANNEL',
    );
  });

  it('rejects a missing EAS update channel', () => {
    expectEnvError(
      { ...validDev, EXPO_PUBLIC_EAS_UPDATE_CHANNEL: undefined },
      'EXPO_PUBLIC_EAS_UPDATE_CHANNEL',
    );
  });

  it('never includes credential values in error messages', () => {
    const secretUrlHost = 'SECRET-HOST.example.com';
    const secretKeyValue = 'sb_secret_TOKEN_VALUE_99';
    try {
      parseEnv({
        ...validDev,
        EXPO_PUBLIC_SUPABASE_URL: `http://${secretUrlHost}`,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: secretKeyValue,
      });
      throw new Error('expected parseEnv to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const envError = error as EnvValidationError;
      expect(envError.message).not.toContain(secretUrlHost);
      expect(envError.message).not.toContain(secretKeyValue);
      for (const issue of envError.issues) {
        expect(issue.message).not.toContain(secretUrlHost);
        expect(issue.message).not.toContain(secretKeyValue);
      }
    }
  });

  it('ignores unknown env keys (explicit EXPO_PUBLIC_* allowlist only)', () => {
    const config = parseEnv({
      ...validDev,
      EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'must-not-leak',
      EXPO_PUBLIC_EXTRA: 'ignored',
      UNRELATED: 'ignored',
    });
    expect(Object.keys(config).sort()).toEqual([
      'appEnv',
      'easUpdateChannel',
      'supabaseAnonKey',
      'supabaseUrl',
    ]);
    expect(JSON.stringify(config)).not.toContain('must-not-leak');
  });

  it('exposes the canonical APP_ENV order', () => {
    expect(APP_ENV_VALUES).toEqual(['development', 'preview', 'production']);
  });

  it('loadEnv parses an explicit source object', () => {
    expect(loadEnv(validPreview).appEnv).toBe('preview');
    expect(loadEnv(validProduction).easUpdateChannel).toBe('production');
  });
});
