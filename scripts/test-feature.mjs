import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const featureId = process.argv[2];

if (!/^F\d{2}$/.test(featureId ?? '')) {
  console.error('Usage: pnpm test:feature <FEATURE_ID> (example: pnpm test:feature F05)');
  process.exit(2);
}

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PACKAGE_DIRS = ['packages', 'apps', 'tests'].flatMap((dir) => {
  const abs = join(ROOT, dir);
  try {
    return readdirSync(abs)
      .filter((entry) => statSync(join(abs, entry)).isDirectory())
      .map((entry) => join(abs, entry));
  } catch {
    return [];
  }
});

const FILE_PATTERN = new RegExp(`\\.${featureId}\\.test\\.(ts|tsx|js|jsx)$`);

function findFeatureTestFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFeatureTestFiles(abs));
    } else if (entry.isFile() && FILE_PATTERN.test(entry.name)) {
      files.push(abs);
    }
  }
  return files;
}

const matched = PACKAGE_DIRS.flatMap((dir) => findFeatureTestFiles(dir));

if (matched.length === 0) {
  console.error(`[test:feature] no test files match feature ${featureId}`);
  console.error('[test:feature] convention: name feature-scoped files like <subject>.F05.test.ts');
  process.exit(1);
}

const pattern = `[.]${featureId}[.]`;
console.log(
  `[test:feature] ${matched.length} file(s) match; running workspace tests with pattern ${pattern}`,
);
const result = spawnSync(
  'pnpm',
  ['-r', '--if-present', 'test:unit', '--testPathPattern', pattern, '--passWithNoTests'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
