// Quick runtime smoke for Expo Web: load the app, capture console + page errors,
// screenshot. Uses the system Chrome (channel) to avoid a browser download.
import { chromium } from 'playwright';

const URL = process.env.SMOKE_URL ?? 'http://localhost:8095/';
const OUT = process.env.SMOKE_OUT ?? 'web-smoke.png';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 }).catch((e) => {
  logs.push(`[goto-error] ${e.message}`);
});
await page.waitForTimeout(4000);

const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 600);
const rootHtmlLen = (await page.content()).length;
await page.screenshot({ path: OUT, fullPage: true });

console.log('=== CONSOLE / ERRORS ===');
console.log(logs.slice(0, 60).join('\n') || '(none)');
console.log('=== BODY TEXT (first 600) ===');
console.log(bodyText || '(empty)');
console.log('=== html length ===', rootHtmlLen);
console.log('=== screenshot ===', OUT);

await browser.close();
