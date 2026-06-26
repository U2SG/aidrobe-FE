// Preflight for `pnpm test`. The regression runner executes *.test.ts directly
// via Node's built-in TypeScript type-stripping (Node >= 22.18 / 24), so on an
// older Node `pnpm test` would otherwise die with a cryptic
// ERR_UNKNOWN_FILE_EXTENSION before any test runs. Plain CommonJS so it loads on
// any Node version.
const [major, minor] = process.versions.node.split('.').map(Number);
const ok = major > 22 || (major === 22 && minor >= 18);
if (!ok) {
  console.error(
    `\n✗ Node ${process.versions.node} is too old to run the regression tests.\n` +
      `  pnpm test runs TypeScript scripts directly via Node type-stripping (requires Node >= 22.18; CI uses 24).\n` +
      `  Switch Node (see .nvmrc / package.json "engines"), e.g. \`nvm use\` or install Node 24.\n`,
  );
  process.exit(1);
}
