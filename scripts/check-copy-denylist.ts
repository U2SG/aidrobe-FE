// Copy denylist guard (redesign brief v0.9 §11.2). Fails the build if forbidden
// business copy reaches production. Dependency-free; runs in `npm test`.
//
// Scope, chosen to be high-signal with ~zero false positives:
//  1. i18n catalogues (src/i18n/{zh-CN,en-US}.ts) — the user-facing copy
//     registry. Every forbidden word is checked on non-comment lines (keys are
//     safe English dotted paths; values are the copy).
//  2. All of src/**/*.{ts,tsx} — only the words that can NEVER be legitimate
//     code (body/age-shaming terms + multi-word demo phrases), so scanning
//     comments/identifiers too is safe.
//
// Test fixtures / docs are out of scope by construction (we only walk src/, and
// there are no *.test.* under src/).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Forbidden in the i18n copy registry (user-visible strings).
const I18N_DENY = [
  'demo',
  'mock',
  'sample outfit',
  'local showcase',
  'placeholder outfit',
  '雨天通勤',
  '银蓝冷调',
  '显瘦',
  '遮肉',
  '减龄',
  '中年',
];

// Forbidden anywhere in src (never legitimate in code or comments).
const SRC_DENY = ['显瘦', '遮肉', '减龄', '中年', 'sample outfit', 'local showcase', 'placeholder outfit'];

type Hit = { file: string; line: number; word: string; text: string };
const hits: Hit[] = [];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function scan(file: string, words: string[], skipComments: boolean) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (skipComments && (trimmed.startsWith('//') || trimmed.startsWith('*'))) return;
    const lower = raw.toLowerCase();
    for (const word of words) {
      if (lower.includes(word.toLowerCase())) {
        hits.push({ file: relative(srcDir, file), line: i + 1, word, text: trimmed.slice(0, 120) });
      }
    }
  });
}

const allFiles = walk(srcDir);
for (const file of allFiles) {
  const norm = file.replace(/\\/g, '/');
  if (norm.endsWith('src/i18n/zh-CN.ts') || norm.endsWith('src/i18n/en-US.ts')) {
    scan(file, I18N_DENY, true);
  }
  scan(file, SRC_DENY, false);
}

if (hits.length > 0) {
  console.error('✗ copy denylist: forbidden copy found');
  for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.word}]  ${h.text}`);
  console.error(`\n${hits.length} violation(s). Remove forbidden business copy (see brief §11.2).`);
  process.exit(1);
}

console.log(`✓ copy denylist: ${allFiles.length} src files clean`);
