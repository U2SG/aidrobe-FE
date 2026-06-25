import { Badge, type BadgeTone } from './Badge';

// AI-detection confidence indicator (FE#39). Maps a 0–1 recognizer score to a
// tone so low-confidence metadata reads as "review me" rather than final. The
// caller owns the label text (i18n lives in the catalogues, not here); this only
// owns the score→tone mapping so the threshold stays in one place.
//
// Convention: < 0.6 = low (warning) / < 0.85 = medium (neutral) / else high
// (success). Sources that carry no score should simply not render the badge.

export function confidenceTone(score: number): BadgeTone {
  if (score < 0.6) return 'warning';
  if (score < 0.85) return 'neutral';
  return 'success';
}

export function isLowConfidence(score: number | null | undefined): boolean {
  return score != null && score < 0.6;
}

interface Props {
  /** Recognizer score in [0, 1]. */
  score: number;
  /** Localized label, e.g. "62%" or "Low confidence". */
  label: string;
}

export function ConfidenceBadge({ score, label }: Props) {
  return <Badge label={label} tone={confidenceTone(score)} />;
}
