import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');

function readRepositoryFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8');
}

describe('S04 infrastructure baseline contract', () => {
  it('uses the required forward-only migration naming convention', () => {
    const migrationsDirectory = path.join(REPOSITORY_ROOT, 'supabase/migrations');
    const migrationNames = fs
      .readdirSync(migrationsDirectory)
      .filter((name) => name.endsWith('.sql'));

    expect(migrationNames.length).toBeGreaterThan(0);
    for (const migrationName of migrationNames) {
      expect(migrationName).toMatch(/^\d{12}_\d{3}_[a-z0-9]+_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/);
    }
  });

  it('declares deterministic seed and exact mobile auth redirects', () => {
    const config = readRepositoryFile('supabase/config.toml');

    expect(fs.existsSync(path.join(REPOSITORY_ROOT, 'supabase/seed.sql'))).toBe(true);
    expect(config).toContain('sql_paths = ["./seed.sql"]');
    expect(config).toContain('"financeapp-dev://auth/callback"');
    expect(config).toContain('"financeapp-preview://auth/callback"');
    expect(config).toContain('"financeapp://auth/callback"');
    expect(config).not.toMatch(/additional_redirect_urls\s*=\s*\[[^\]]*\*/s);
  });

  it('keeps OAuth providers fail-closed until secrets are supplied', () => {
    const config = readRepositoryFile('supabase/config.toml');

    expect(config).toMatch(/\[auth\.external\.google\][\s\S]*?enabled = false/);
    expect(config).toMatch(/\[auth\.external\.apple\][\s\S]*?enabled = false/);
    expect(config).toContain('env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)');
    expect(config).toContain('env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)');
  });

  it('separates EAS development, preview, and production channels', () => {
    const eas = JSON.parse(readRepositoryFile('apps/mobile/eas.json')) as {
      build: Record<string, Record<string, unknown>>;
    };

    expect(eas.build.development).toMatchObject({
      developmentClient: true,
      distribution: 'internal',
      channel: 'development',
      environment: 'development',
    });
    expect(eas.build['development-simulator']).toMatchObject({
      extends: 'development',
      ios: { simulator: true },
    });
    expect(eas.build.preview).toMatchObject({
      distribution: 'internal',
      channel: 'preview',
      environment: 'preview',
    });
    expect(eas.build.production).toMatchObject({
      channel: 'production',
      environment: 'production',
    });
  });

  it('builds Android and iOS development clients and defines the smoke flow', () => {
    const workflow = readRepositoryFile('apps/mobile/.eas/workflows/s04-builds.yml');
    const smokeFlow = readRepositoryFile('tests/e2e/smoke.yaml');

    expect(workflow).toContain('platform: android');
    expect(workflow).toContain('platform: ios');
    expect(workflow).toContain('profile: development-simulator');
    expect(smokeFlow).toContain('appId: id.financeapp.mobile.dev');
    expect(smokeFlow).toContain('openLink: financeapp-dev://');
  });
});
