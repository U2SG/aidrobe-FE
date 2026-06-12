// E2E walkthrough of the Expo Web app against the live backend.
// Drives onboarding to completion, then visits each main tab, screenshots
// every screen, and collects console errors + observed /v1 API calls.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.WALK_URL ?? 'http://localhost:8095/';
const DIR = process.env.WALK_DIR ?? 'walk-shots';
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

const consoleErrors = [];
const apiCalls = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('/v1/') || u.includes('/healthz')) {
    apiCalls.push(`${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, '')}`);
  }
});

const shot = async (name) => { await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true }); console.log(`  shot: ${name}`); };
const visible = async (text) => page.getByText(text, { exact: false }).first().isVisible({ timeout: 1200 }).catch(() => false);
const tap = async (text) => {
  const el = page.getByText(text, { exact: false }).first();
  if (await el.isVisible({ timeout: 1200 }).catch(() => false)) { await el.click(); await page.waitForTimeout(1200); return true; }
  return false;
};

await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });
await page.waitForTimeout(3000);
await shot('01-welcome');

// Drive onboarding: keep clicking the primary advance button until main tabs appear.
// Note: 允许访问 only requests OS permissions and does NOT navigate; 暂时跳过 is the real "continue".
const advanceLabels = ['开始使用', '下一步', '完成', '进入', '开始体验', '完成设置'];
let reached = false;
for (let i = 0; i < 10; i++) {
  if ((await visible('我的')) && (await visible('衣橱'))) { reached = true; break; }
  let clicked = false;
  for (const label of advanceLabels) { if (await tap(label)) { clicked = true; break; } }
  if (!clicked) { for (const skip of ['暂时跳过', '跳过']) { if (await tap(skip)) { clicked = true; break; } } }
  if (!clicked) break;
}
await page.waitForTimeout(2500);
console.log(reached ? 'OK  reached main tabs' : 'WARN did not detect main tabs');
await shot('02-today');

// Visit each tab. Use exact match so body text like "基于真实衣橱" doesn't shadow the tab.
const tapExact = async (text) => {
  const el = page.getByText(text, { exact: true }).last();
  if (await el.isVisible({ timeout: 2000 }).catch(() => false)) { await el.click(); await page.waitForTimeout(1500); return true; }
  return false;
};
for (const [label, file] of [['衣橱', '03-wardrobe'], ['我的', '04-settings'], ['今日', '05-today']]) {
  if (await tapExact(label)) { await shot(file); console.log(`OK  tab ${label}`); }
  else console.log(`ERR tab ${label} not found`);
}

// Drill into wardrobe: open list, tap first item card -> detail.
if (await tapExact('衣橱')) {
  await page.waitForTimeout(1500);
  await shot('06-wardrobe-list');
  for (const name of ['奶白色衬衫', '燕麦色针织衫', '靛蓝直筒牛仔裤']) {
    if (await tap(name)) { await shot('07-item-detail'); console.log(`OK  item ${name}`); break; }
  }
}

await page.waitForTimeout(1500);
console.log('\n=== CONSOLE ERRORS ===');
console.log(consoleErrors.length ? [...new Set(consoleErrors)].slice(0, 40).join('\n') : '(none)');
console.log('\n=== API CALLS (/v1, /healthz) ===');
console.log(apiCalls.length ? [...new Set(apiCalls)].join('\n') : '(NONE — frontend not reaching backend)');

await browser.close();
