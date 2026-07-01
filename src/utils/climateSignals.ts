// Pure (RN-free, import-free) indoor-climate inference signal (brief v0.9 §9.2).
// A temperature-mismatch between the user's feedback and the outdoor weather is
// a medium signal that the environment that actually governs their comfort is
// indoor, not the street. This only *detects* the signal for telemetry; it never
// labels the user (brief §9.6 forbids "室内通勤用户").
import type { RecommendationReasonSource } from '@/types/api';

// Outdoor thresholds past which the mismatch is meaningful.
export const INDOOR_COLD_OUTDOOR_MIN_C = 22; // "too cold" while it's warm out
export const INDOOR_WARM_OUTDOOR_MAX_C = 10; // "too warm" while it's cold out

export type IndoorClimateSignal = 'indoor_cold' | 'indoor_warm';

/**
 * Detect an indoor-climate mismatch from a dislike reason + outdoor temperature.
 *   too_cold & outdoor ≥ 22°C → 'indoor_cold' (cold indoor environment)
 *   too_warm & outdoor ≤ 10°C → 'indoor_warm' (overheated indoor environment)
 * Returns null otherwise (incl. unknown temperature).
 */
export function detectIndoorClimateSignal(
  reasonTag: string,
  temperatureC: number | null | undefined,
): IndoorClimateSignal | null {
  if (temperatureC == null) return null;
  if (reasonTag === 'too_cold' && temperatureC >= INDOOR_COLD_OUTDOOR_MIN_C) return 'indoor_cold';
  if (reasonTag === 'too_warm' && temperatureC <= INDOOR_WARM_OUTDOOR_MAX_C) return 'indoor_warm';
  return null;
}

/** The reason source a confirmed indoor-climate signal maps to. */
export const INDOOR_CLIMATE_SOURCE: RecommendationReasonSource = 'indoor_climate_inference';
