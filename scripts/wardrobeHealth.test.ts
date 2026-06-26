// Regression coverage for FE #46 — wardrobe-health code -> localized copy.
//
// No jest/RNTL in this repo, so this is a dependency-free runnable assertion
// over the pure helper the screen renders from, bound to the REAL i18n
// catalogues (not a synthetic translator) so a missing/drifted key is caught.
// Run:  node scripts/wardrobeHealth.test.ts   (Node >= 22 type-stripping)
//
// Lives outside src/ so it is excluded from lint (scoped to src/**); stays
// tsc-clean and is genuinely executed. Imports use explicit `.ts` extensions
// and RELATIVE paths — Node type-stripping does not resolve `@/` aliases, and
// the helper / i18n graph reaches `@/` only via type-only (erased) imports.
import assert from 'node:assert/strict';

// Import the catalogue OBJECTS + enum localizer directly (relative, `.ts`).
// We can't import `src/i18n/index.ts` because its runtime `./en-US` import is
// extensionless and Node ESM won't resolve that; the catalogues themselves have
// only type-only imports (erased), so they load cleanly under type-stripping.
import { enUS } from '../src/i18n/en-US.ts';
import { zhCN } from '../src/i18n/zh-CN.ts';
import { tCategory } from '../src/i18n/domainLabels.ts';
import type { AppLocale } from '../src/utils/locale.ts';
import type { WardrobeHealthInsight } from '../src/types/api.ts';
import {
  isWardrobeHealthSparse,
  wardrobeHealthHeadline,
  wardrobeHealthInsightCopy,
} from '../src/screens/discover/wardrobeHealth.ts';

const CATALOGUES = { 'zh-CN': zhCN, 'en-US': enUS } as const;

// Bind the real catalogue + enum localizer to a locale, mirroring useT()/translate
// (same `{name}` interpolation as src/i18n/index.ts).
function bind(locale: AppLocale) {
  const catalogue: Record<string, string> = CATALOGUES[locale];
  return {
    t: (key: string, params?: Record<string, string | number>) => {
      const template = catalogue[key] ?? zhCN[key as keyof typeof zhCN] ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
        const value = params[name];
        return value === undefined ? match : String(value);
      });
    },
    tEnum: (_kind: 'category', value: string | null | undefined) => tCategory(locale, value),
  };
}

const LOCALES: AppLocale[] = ['zh-CN', 'en-US'];

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// --- 4 levels x 2 locales: headline + summary present, no raw key leaks. ----
for (const locale of LOCALES) {
  const { t } = bind(locale);
  for (const level of ['great', 'good', 'fair', 'low'] as const) {
    const { headline, summary } = wardrobeHealthHeadline(level, t);
    check(`${locale} level ${level} headline`, headline.length > 0 && !headline.includes('wardrobeHealth.'));
    check(`${locale} level ${level} summary`, summary.length > 0 && !summary.includes('wardrobeHealth.'));
  }
  // Unknown level degrades to a real generic key, not a raw key string.
  const unknown = wardrobeHealthHeadline('mystery', t);
  check(`${locale} unknown level fallback`, unknown.headline.length > 0 && !unknown.headline.includes('wardrobeHealth.'));
}

// --- 4 insight types x 2 locales: title + suggestion + metric interpolation. -
const INSIGHTS: WardrobeHealthInsight[] = [
  { type: 'wear_coverage', severity: 'high', metrics: { coverage_ratio: 0.4, window_days: 90 } },
  { type: 'unused_items', severity: 'high', metrics: { unused_60: 3, unused_90: 5, unused_180: 1 } },
  {
    type: 'category_balance',
    severity: 'low',
    metrics: { dominant_ratio: 0.6, counts: { top: 3, bottom: 1, shoes: 1 } },
  },
  { type: 'data_sparsity', severity: 'medium', metrics: { item_count: 2 } },
];

for (const locale of LOCALES) {
  const { t, tEnum } = bind(locale);
  for (const insight of INSIGHTS) {
    const copy = wardrobeHealthInsightCopy(insight, t, tEnum);
    check(`${locale} ${insight.type} title`, copy.title.length > 0 && !copy.title.includes('wardrobeHealth.'));
    check(`${locale} ${insight.type} suggestion`, copy.suggestion.length > 0 && !copy.suggestion.includes('wardrobeHealth.'));
    check(`${locale} ${insight.type} severityLabel`, copy.severityLabel.length > 0 && !copy.severityLabel.includes('wardrobeHealth.'));
    // No unresolved {placeholder} braces remain after interpolation.
    check(`${locale} ${insight.type} no stray placeholders`, !/\{[a-zA-Z]/.test(copy.title + copy.suggestion));
  }
}

// --- Metric interpolation is correct (ratio -> whole percent). --------------
{
  const { t, tEnum } = bind('en-US');
  const coverage = wardrobeHealthInsightCopy(INSIGHTS[0]!, t, tEnum);
  check('coverage interpolates 40% and 90 days', coverage.title.includes('40%') && coverage.title.includes('90'));
  const unused = wardrobeHealthInsightCopy(INSIGHTS[1]!, t, tEnum);
  check('unused interpolates unused_90 = 5', unused.title.includes('5'));
  const balance = wardrobeHealthInsightCopy(INSIGHTS[2]!, t, tEnum);
  // dominant category `top` is localized (English: "Top"), never raw "top" leaking as a code.
  check('balance localizes dominant category + 60%', balance.title.includes('Top') && balance.title.includes('60%'));
}
{
  const { t, tEnum } = bind('zh-CN');
  const balanceZh = wardrobeHealthInsightCopy(INSIGHTS[2]!, t, tEnum);
  check('balance zh localizes category to 上衣', balanceZh.title.includes('上衣'));
}

// --- Unknown insight type degrades gracefully (no crash, real copy). --------
for (const locale of LOCALES) {
  const { t, tEnum } = bind(locale);
  const bogus = wardrobeHealthInsightCopy(
    { type: 'brand_new_code', severity: 'whatever', metrics: {} },
    t,
    tEnum,
  );
  check(`${locale} unknown type title fallback`, bogus.title.length > 0 && !bogus.title.includes('wardrobeHealth.'));
  check(`${locale} unknown type suggestion fallback`, bogus.suggestion.length > 0);
  // Unknown severity normalizes to a valid styling code.
  check(`${locale} unknown severity normalizes`, ['low', 'medium', 'high'].includes(bogus.severity));
}

// --- data_sparsity detection drives the empty state. -----------------------
check('sparse detected', isWardrobeHealthSparse(INSIGHTS));
check('not sparse without data_sparsity', !isWardrobeHealthSparse(INSIGHTS.slice(0, 3)));

// eslint-disable-next-line no-console
console.log(`wardrobeHealth: ${passed}/${passed} cases passed`);
