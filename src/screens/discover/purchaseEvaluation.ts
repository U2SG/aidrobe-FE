// FE#74 — RN-free presentation helpers for the Should-I-Buy purchase-evaluation
// cards (BE#69 `evaluation`). Type-only imports so the Node regression runner can
// load it (mirrors wardrobeHealth.ts).

import type { WardrobeGapDetail } from '@/types/api';

export type SeverityTone = 'neutral' | 'warning' | 'danger';

/** Order severities so the most pressing gap/redundancy leads the card list. */
export function severityRank(severity: string | null | undefined): number {
  switch (severity) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/** Map a severity (or redundancy level) to a Badge tone. Deliberately tops out at
 *  'danger' (not an alarm color) — the copy stays helpful, not shaming. */
export function severityTone(severity: string | null | undefined): SeverityTone {
  switch (severity) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Most-severe gaps first; stable for equal severities. */
export function sortGapsBySeverity(gaps: readonly WardrobeGapDetail[]): WardrobeGapDetail[] {
  return [...gaps].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}
