// Lightweight regression runner (FE #48).
//
// Discovers and runs every `scripts/*.test.ts` as a separate `node` process
// (Node >= 22 type-stripping), so new dependency-free regression checks are
// picked up automatically just by dropping a `*.test.ts` file in scripts/.
// No jest/RNTL stack. Run:  node scripts/run-regressions.ts  (or `pnpm test`).
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const testFiles = readdirSync(scriptsDir)
  .filter((f) => f.endsWith('.test.ts'))
  .sort();

if (testFiles.length === 0) {
  console.error('run-regressions: no scripts/*.test.ts found');
  process.exit(1);
}

let failed = 0;
for (const file of testFiles) {
  process.stdout.write(`\n▶ ${file}\n`);
  const result = spawnSync(process.execPath, [join(scriptsDir, file)], { stdio: 'inherit' });
  if (result.status === 0) {
    console.log(`✓ ${file}`);
  } else {
    failed += 1;
    console.error(`✗ ${file} failed (exit ${result.status})`);
  }
}

console.log(`\nregressions: ${testFiles.length - failed}/${testFiles.length} passed`);
process.exit(failed > 0 ? 1 : 0);
