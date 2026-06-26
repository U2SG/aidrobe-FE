// Pure code -> localized-copy mapping for the wardrobe-health surface (FE #46).
//
// The server returns STABLE CODES + NUMERIC METRICS ONLY (no copy), so all
// user-facing strings come from the i18n catalogues. This module is the single
// place that turns {level} / {type, severity, metrics} into localized strings.
//
// It is intentionally dependency-free at RUNTIME: the translator (`t`) and the
// enum localizer (`tEnum`) are INJECTED, not imported. That keeps the module
// importable by `scripts/wardrobeHealth.test.ts` under Node type-stripping,
// which does not resolve `@/` path aliases. Only type-only imports are allowed
// here (they are erased before module resolution).
import type { I18nKey } from '@/i18n/zh-CN';
import type { WardrobeHealthInsight } from '@/types/api';

// Injected translators (type-only imports keep this module runtime-`@/`-free so
// the test can load it under Node type-stripping). The consuming component
// passes `useT().t` / `useT().tEnum` directly. Keys are built dynamically and
// cast to `I18nKey` via `k()` — every key produced is verified to exist by the
// regression test against the real catalogues.
export type Translate = (key: I18nKey, params?: Record<string, string | number>) => string;
export type TEnum = (kind: 'category', value: string | null | undefined) => string;

function k(key: string): I18nKey {
  return key as I18nKey;
}

// Known codes (source of truth: BE #49 / PR #58 schema). Unknown server codes
// degrade to a generic '*.unknown' key that always exists — never a raw key.
const KNOWN_LEVELS: readonly string[] = ['great', 'good', 'fair', 'low'];
const KNOWN_TYPES: readonly string[] = [
  'wear_coverage',
  'unused_items',
  'category_balance',
  'data_sparsity',
];
const KNOWN_SEVERITIES: readonly string[] = ['low', 'medium', 'high'];

function levelCode(level: string): string {
  return KNOWN_LEVELS.includes(level) ? level : 'unknown';
}

function typeCode(type: string): string {
  return KNOWN_TYPES.includes(type) ? type : 'unknown';
}

function severityCode(severity: string): string {
  return KNOWN_SEVERITIES.includes(severity) ? severity : 'low';
}

// Format a 0–1 ratio as a whole-number percent (e.g. 0.4 -> 40). Out-of-range
// or missing values clamp to 0 so copy never shows NaN / negative percents.
function toPercent(ratio: number | undefined): number {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return 0;
  return Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
}

function num(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

// Pick the dominant category from a counts map (highest count wins; stable on
// ties by key). Returns null when there is nothing to rank.
function dominantCategory(counts: Record<string, number> | undefined): string | null {
  if (!counts) return null;
  let best: string | null = null;
  let bestCount = -Infinity;
  for (const [key, value] of Object.entries(counts)) {
    if (value > bestCount) {
      best = key;
      bestCount = value;
    }
  }
  return best;
}

export interface WardrobeHealthHeadline {
  headline: string;
  summary: string;
}

export function wardrobeHealthHeadline(level: string, t: Translate): WardrobeHealthHeadline {
  const code = levelCode(level);
  return {
    headline: t(k(`wardrobeHealth.level.${code}.headline`)),
    summary: t(k(`wardrobeHealth.level.${code}.summary`)),
  };
}

export interface WardrobeHealthInsightCopy {
  /** Localized severity label (drives emphasis + a11y hint). */
  severityLabel: string;
  /** Normalized severity code for visual styling. */
  severity: 'low' | 'medium' | 'high';
  title: string;
  suggestion: string;
}

export function wardrobeHealthInsightCopy(
  insight: WardrobeHealthInsight,
  t: Translate,
  tEnum: TEnum,
): WardrobeHealthInsightCopy {
  const code = typeCode(insight.type);
  const sev = severityCode(insight.severity) as 'low' | 'medium' | 'high';
  const m = insight.metrics ?? {};

  // Per-type metric interpolation. Ratios are pre-formatted to whole percent;
  // the dominant category is localized via tEnum (never raw English on the wire).
  let params: Record<string, string | number> = {};
  switch (code) {
    case 'wear_coverage':
      params = { coveragePct: toPercent(m.coverage_ratio), windowDays: num(m.window_days) };
      break;
    case 'unused_items':
      params = {
        unused90: num(m.unused_90),
        unused60: num(m.unused_60),
        unused180: num(m.unused_180),
      };
      break;
    case 'category_balance':
      params = {
        category: tEnum('category', dominantCategory(m.counts)),
        dominantPct: toPercent(m.dominant_ratio),
      };
      break;
    case 'data_sparsity':
      params = { itemCount: num(m.item_count) };
      break;
    default:
      params = {};
  }

  return {
    severityLabel: t(k(`wardrobeHealth.severity.${sev}`)),
    severity: sev,
    title: t(k(`wardrobeHealth.insight.${code}.title`), params),
    suggestion: t(k(`wardrobeHealth.insight.${code}.suggestion`), params),
  };
}

// True when the response signals a near-empty wardrobe — render the encouraging
// empty state instead of the insight rows.
export function isWardrobeHealthSparse(insights: WardrobeHealthInsight[]): boolean {
  return insights.some((i) => i.type === 'data_sparsity');
}
