// Central, single-source read of build-time feature flags injected via
// app.config.ts -> `extra` -> Constants.expoConfig?.extra (same channel as
// API_BASE_URL / APP_ENV in src/api/client.ts). Read flags from here only —
// do NOT scatter `Constants.expoConfig?.extra` reads across the app.
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

/**
 * MVP V2 redesign shell master switch. When false (default), the app renders the
 * existing V1 UI unchanged; when true, it opts into the V2 IA / Today experience.
 * Coarse single flag by design (redesign brief v0.9 §3.3) — no per-feature gating.
 */
export const enableMvpV2Ui: boolean = extra.ENABLE_MVP_V2_UI === true;

/**
 * V3 Should-I-Buy purchase-decision flow (v3-p0-contract §2). When false
 * (default), the entry point does not render and the V2 SenseCheck experience
 * is unchanged. The BE flag ENABLE_V3_PURCHASE_DECISION independently gates
 * the endpoints (503 while off), so a skewed build still degrades to the
 * self-hiding "not open yet" state instead of a broken screen.
 */
export const enableV3PurchaseDecision: boolean = extra.ENABLE_V3_PURCHASE_DECISION === true;
