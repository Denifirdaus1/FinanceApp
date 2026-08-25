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

function getColorBlock(source: string, name: 'lightColors' | 'darkColors'): string {
  const match = new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\} as const`).exec(source);
  if (!match?.[1]) {
    throw new Error(`Could not find ${name} token block`);
  }
  return match[1];
}

function getDirectColor(block: string, name: string): string {
  const match = new RegExp(`^  ${name}: '([^']+)'`, 'm').exec(block);
  if (!match?.[1]) {
    throw new Error(`Could not find ${name} color token`);
  }
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4].map(
    (offset) => Number.parseInt(hex.slice(offset + 1, offset + 3), 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('U00 public UI contract', () => {
  it('exports exactly the named primitive surface and theme entry points', () => {
    const entry = read('packages/ui/src/index.ts');
    for (const name of primitiveNames) {
      expect(entry).toMatch(new RegExp(`\\b${name}\\b`));
    }
    for (const name of [
      'ThemeProvider',
      'useTheme',
      'useReducedMotion',
      'getTheme',
      'lightTheme',
      'darkTheme',
    ]) {
      expect(entry).toMatch(new RegExp(`\\b${name}\\b`));
    }
    expect(entry).not.toContain('export *');
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
    expect(tokenSource).toContain('skeletonBaseOpacity');
    expect(tokenSource).toContain('instant');
    expect(tokenSource).toContain('chart');
    expect(tokenSource).toContain('#FFF9F0');
    expect(tokenSource).toContain('#17130F');
  });

  it('keeps actual text/status pairs at readable contrast in both themes', () => {
    const source = read('packages/ui/src/tokens/colors.ts');
    const pairs = [
      ['textPrimary', 'canvas'],
      ['textSecondary', 'canvas'],
      ['textMuted', 'canvas'],
      ['onPrimary', 'primary'],
      ['onPrimaryContainer', 'primaryContainer'],
      ['success', 'canvas'],
      ['warning', 'canvas'],
      ['danger', 'canvas'],
      ['info', 'canvas'],
    ] as const;

    for (const themeName of ['lightColors', 'darkColors'] as const) {
      const block = getColorBlock(source, themeName);
      for (const [foreground, background] of pairs) {
        expect(
          contrastRatio(getDirectColor(block, foreground), getDirectColor(block, background)),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps raw hex values confined to token definitions', () => {
    expect(fs.existsSync(COMPONENTS_ROOT)).toBe(true);
    const productionFiles = [
      ...listFiles(COMPONENTS_ROOT),
      ...listFiles(path.join(UI_ROOT, 'patterns')),
    ].filter((filePath) => filePath.endsWith('.ts') || filePath.endsWith('.tsx'));
    for (const filePath of productionFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    }
    const mobileFiles = listFiles(path.join(REPOSITORY_ROOT, 'apps/mobile/src')).filter(
      (filePath) =>
        (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
        !filePath.endsWith('.test.ts') &&
        !filePath.endsWith('.test.tsx'),
    );
    for (const filePath of mobileFiles) {
      expect(fs.readFileSync(filePath, 'utf8')).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
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
    expect(read('apps/mobile/src/app/providers/theme-provider.tsx')).not.toMatch(
      /#[0-9A-Fa-f]{3,8}\b/,
    );
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
