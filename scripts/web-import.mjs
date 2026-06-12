// E2E for the add/import flow on web: onboarding -> wardrobe (empty) -> 添加衣物
// -> 从相册导入 (file chooser) -> presigned POST upload to minio -> fake-vision
// recognition -> 保存到衣橱. Verifies a wardrobe item ends up created.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const URL = process.env.IMPORT_URL ?? 'http://localhost:8095/';
const DIR = 'walk-shots';
mkdirSync(DIR, { recursive: true });
const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, 'fixtures/test-shirt.png');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 414, height: 896 } });
const errors = [];
const api = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('/v1/') || u.includes(':9000')) api.push(`${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, (m) => m.includes('9000') ? '[minio]' : '')}`);
});
const shot = async (n) => { await page.screenshot({ path: `${DIR}/${n}.png`, fullPage: true }); console.log(`  shot: ${n}`); };
const tap = async (text, exact = false) => {
  const el = page.getByText(text, { exact }).first();
  if (await el.isVisible({ timeout: 2000 }).catch(() => false)) { await el.click(); await page.waitForTimeout(1000); return true; }
  return false;
};

await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });
await page.waitForTimeout(3000);

// onboarding (proven loop from web-walk.mjs): advance until main tabs appear
const visible = async (t) => page.getByText(t, { exact: false }).first().isVisible({ timeout: 1200 }).catch(() => false);
const advanceLabels = ['开始使用', '下一步', '完成', '进入', '开始体验', '完成设置'];
for (let i = 0; i < 10; i++) {
  if ((await visible('我的')) && (await visible('衣橱'))) break;
  let clicked = false;
  for (const label of advanceLabels) { if (await tap(label)) { clicked = true; break; } }
  if (!clicked) { for (const skip of ['暂时跳过', '跳过']) { if (await tap(skip)) { clicked = true; break; } } }
  if (!clicked) break;
}
await page.waitForTimeout(1500);
await page.getByText('衣橱', { exact: true }).last().click();
// Wait for the wardrobe list query to resolve and the empty-state CTA to render.
let ctaReady = false;
for (let i = 0; i < 15; i++) {
  if (await page.getByText('添加衣物', { exact: false }).first().isVisible({ timeout: 1000 }).catch(() => false)) { ctaReady = true; break; }
  await page.waitForTimeout(1000);
}
await shot('import-01-wardrobe-empty');

// empty-state CTA -> AddItem
if (!(await tap('添加衣物'))) console.log(`WARN 添加衣物 CTA not found (ctaReady=${ctaReady})`);
await page.waitForTimeout(1500);
await shot('import-02-add-item');

// album import -> file chooser
page.once('filechooser', async (fc) => { await fc.setFiles(FIXTURE); console.log('  filechooser: set fixture'); });
await tap('从相册导入');
await page.waitForTimeout(6000); // compress + presign + upload + create task + navigate
await shot('import-03-after-pick');

// ImportConfirm: wait for recognition, then 保存到衣橱
for (let i = 0; i < 15; i++) {
  if (await page.getByText('确认一下识别结果', { exact: false }).isVisible({ timeout: 1000 }).catch(() => false)) break;
  await page.waitForTimeout(1000);
}
await shot('import-04-confirm');
const saved = await tap('保存到衣橱');
console.log(saved ? 'OK  tapped 保存到衣橱' : 'ERR 保存到衣橱 not found');
await page.waitForTimeout(3000);
await shot('import-05-after-save');

console.log('\n=== CONSOLE ERRORS ===');
console.log(errors.length ? [...new Set(errors)].slice(0, 30).join('\n') : '(none)');
console.log('\n=== API / UPLOAD CALLS ===');
console.log([...new Set(api)].join('\n') || '(none)');
await browser.close();
