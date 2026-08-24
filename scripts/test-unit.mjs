import { spawnSync } from 'node:child_process';

const pattern = process.argv[2];

const args = pattern
  ? ['-r', '--if-present', 'test:unit', '--passWithNoTests', pattern]
  : ['-r', '--if-present', 'test:unit'];

const result = spawnSync('pnpm', args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
