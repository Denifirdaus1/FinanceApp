import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { packageInfo } from './index';

const pkgPath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('@financeapp/domain package boundary', () => {
  it('can be imported without runtime error or circular dependency', () => {
    expect(packageInfo.name).toBe('@financeapp/domain');
  });

  it('does not depend on React Native, Expo, or the Supabase client', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const forbidden = ['react-native', 'expo', '@expo/', '@supabase/'];
    for (const [name] of Object.entries(deps)) {
      const isForbidden = forbidden.some((prefix) => name === prefix || name.startsWith(prefix));
      expect(isForbidden).toBe(false);
    }
  });
});
