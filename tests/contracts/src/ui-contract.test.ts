import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const UI_ROOT = path.join(REPOSITORY_ROOT, 'packages/ui/src');
const COMPONENTS_ROOT = path.join(UI_ROOT, 'components');
const TOKENS_ROOT = path.join(UI_ROOT, 'tokens');

const primitiveNames = [
  'Button',
  'Input',
  'MoneyInput',
  'Select',
  'Card',
  'ListRow',
  'Sheet',
  'Dialog',
  'Toast',
  'EmptyState',
  'Skeleton',
  'ErrorState',
  'PermissionState',
  'OfflineBanner',
  'SensitiveValue',
  'ChartFrame',
] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8');
}

function listFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

describe('U00 public UI contract', () => {
  it('exports exactly the named primitive surface and theme entry points', () => {
    const entry = read('packages/ui/src/index.ts');
    for (const name of primitiveNames) {
      expect(entry).toMatch(new RegExp(`\\b${name}\\b`));
    }
    for (const name of ['ThemeProvider', 'useTheme', 'useReducedMotion', 'getTheme', 'lightTheme', 'darkTheme']) {
      expect(entry).toMatch(new RegExp(`\\b${name}\\b`));
    }
    expect(entry).not.toContain("export *");
  });

  it('contains the complete semantic token families from the design specification', () => {
    const tokenSource = listFiles(TOKENS_ROOT)
      .filter((filePath) => filePath.endsWith('.ts'))
      .map((filePath) => fs.readFileSync(filePath, 'utf8'))
      .join('\n');

    expect(tokenSource).toContain('canvas');
    expect(tokenSource).toContain('surfaceRaised');
    expect(tokenSource).toContain('textPrimary');
    expect(tokenSource).toContain('primaryContainer');
    expect(tokenSource).toContain('skeleton');
    expect(tokenSource).toContain('fontVariant');
    expect(tokenSource).toContain('space16');
    expect(tokenSource).toContain('level3');
    expect(tokenSource).toContain('minimumTouchTarget');
    expect(tokenSource).toContain('instant');
    expect(tokenSource).toContain('chart');
    expect(tokenSource).toContain('#FFF9F0');
    expect(tokenSource).toContain('#17130F');
  });

  it('keeps raw hex values confined to token definitions', () => {
    expect(fs.existsSync(COMPONENTS_ROOT)).toBe(true);
    const productionFiles = [...listFiles(COMPONENTS_ROOT), ...listFiles(path.join(UI_ROOT, 'patterns'))].filter(
      (filePath) => filePath.endsWith('.ts') || filePath.endsWith('.tsx'),
    );
    for (const filePath of productionFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    }
  });

  it('keeps the internal catalog deterministic and outside production routes', () => {
    const catalog = read('apps/mobile/src/storybook/catalog.tsx');
    for (const name of primitiveNames) {
      expect(catalog).toContain(name);
    }
    const productionRoutes = listFiles(path.join(REPOSITORY_ROOT, 'apps/mobile/app'));
    for (const routePath of productionRoutes) {
      expect(fs.readFileSync(routePath, 'utf8')).not.toContain('/storybook');
    }
    expect(read('apps/mobile/src/app/providers/theme-provider.tsx')).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it('declares UI runtime peers without installing Storybook or native UI extras', () => {
    const pkg = JSON.parse(read('packages/ui/package.json')) as {
      peerDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.peerDependencies).toMatchObject({ react: '19.2.3', 'react-native': '0.85.3' });
    expect(pkg.dependencies ?? {}).not.toHaveProperty('storybook');
    expect(pkg.devDependencies ?? {}).not.toHaveProperty('@storybook/react-native');
  });
});
