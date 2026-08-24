import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const featureId = process.argv[2];

if (!/^F\d{2}$/.test(featureId ?? '')) {
  console.error('Usage: pnpm test:e2e:feature <FEATURE_ID> (example: pnpm test:e2e:feature F05)');
  process.exit(2);
}

const flow = `tests/e2e/features/${featureId}.yaml`;
if (!existsSync(flow)) {
  console.error(`[test:e2e:feature] no Maestro flow at ${flow}`);
  console.error('[test:e2e:feature] create tests/e2e/features/<FEATURE_ID>.yaml first');
  process.exit(1);
}

console.log(`[test:e2e:feature] running Maestro flow ${flow}`);
const result = spawnSync('maestro', ['test', flow], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
