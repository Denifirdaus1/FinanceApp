import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mobileRoot = path.join(repositoryRoot, 'apps', 'mobile');
const jestPackage = createRequire(import.meta.url).resolve('jest/package.json', {
  paths: [mobileRoot],
});
const jestExecutable = path.join(path.dirname(jestPackage), 'bin', 'jest.js');
const result = spawnSync(
  process.execPath,
  [jestExecutable, '--config', 'apps/mobile/jest.u00.config.js', '--runInBand', '--coverage'],
  {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      NODE_PATH: [path.join(mobileRoot, 'node_modules'), process.env.NODE_PATH]
        .filter(Boolean)
        .join(path.delimiter),
    },
    stdio: 'inherit',
    shell: false,
  },
);

if (result.error) {
  console.error(result.error.message);
}
process.exit(result.status ?? 1);
