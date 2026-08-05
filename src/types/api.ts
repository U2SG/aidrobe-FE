export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export type ItemCategory =
  | 'top'
  | 'bottom'
  | 'outerwear'
  | 'dress'
  | 'shoes'
  | 'accessory'
  | 'other';

// V3+: server enum WardrobeItemStatus. UI groups dirty/lost/donated under "unavailable".
export type ItemStatus = 'wearable' | 'unavailable' | 'dirty' | 'lost' | 'donated';

export type FitStatus =
  | 'unknown'
  | 'fits_well'
  | 'loose'
  | 'tight'
  | 'oversized_ok'
  | 'needs_alteration'
  | 'no_longer_fits';

export type FitIntent =
  | 'regular'
  | 'fitted'
  | 'relaxed'
  | 'oversized'
  | 'cropped'
  | 'longline'
  | 'wide_leg'
  | 'straight'
  | 'slim';

export type FitFeedbackType =
  | 'fits_well'
  | 'tight'
  | 'loose'
  | 'uncomfortable'
  | 'easy_to_move'
  | 'not_flattering';

export type FitScene = 'commute' | 'formal' | 'casual' | 'date' | 'travel';

// User language preference (BE#30). 'system' defers to the device locale.
export type LocalePref = 'zh-CN' | 'en-US' | 'system';

export interface UserSettings {
  departureTime: string | null;
  deviceToken?: string | null;
  pushEnabled?: boolean | null;
  location?: string | null;
  locale?: LocalePref | null;
}

export interface ServerUserSettings {
  departure_time?: string | null;
  device_token?: string | null;
  push_enabled?: boolean | null;
  location?: string | null;
  locale?: string | null;
}

export interface UpdateUserSettingsBody {
  departureTime?: string | null;
  deviceToken?: string | null;
  pushEnabled?: boolean | null;
  location?: string | null;
  locale?: LocalePref | null;
}

// V4 item cutout lifecycle. `queued` → show original photo + "精修中" badge;
// `ready` → cover_image_url is the product-shot cutout; `failed`/`skipped` →
// stay on the original photo, no badge.
export type CutoutStatus = 'skipped' | 'queued' | 'ready' | 'failed';

export interface WardrobeItem {
  id: string;
  name: string;
  // BE#30 (optional; server may omit on older deployments). When present these
  // drive the localized display-name fallback (see resolveItemDisplayName).
  nameSource?: string | null;
  displayName?: string | null;
  localizedNames?: Record<string, string> | null;
  category: ItemCategory;
  color: string;
  imageUrl: string | null;
  status: ItemStatus;
  cutoutStatus: CutoutStatus;
  location?: string | null;
  // Extended (optional, server may omit)
  subCategory?: string | null;
  colorSecondary?: string | null;
  material?: string | null;
  seasonTags?: string[] | null;
  styleTags?: string[] | null;
  formalityScore?: number | null;
  timeCostLevel?: string | null;
  purchasePrice?: number | null;
  wearCount?: number;
  sizeLabel?: string | null;
  sizeRegion?: string | null;
  fitIntent?: FitIntent | null;
  fitStatus?: FitStatus;
  comfortScore?: number | null;
  lastWorn?: string | null;
  purchaseDate?: string | null;
  // FE#39 seam: AI-detection confidence for low-confidence review affordances.
  // Persisted WardrobeItem rows don't carry these today (confidence lives on the
  // import/recognition flow); fields are optional so the item-detail review UI
  // lights up automatically once the server starts returning them. Until then
  // they stay undefined and the badge simply doesn't render — no fabricated score.
  categoryConfidence?: number | null;
  colorConfidence?: number | null;
}

export interface ServerWardrobeItem {
  item_id: string;
  title: string;
  // BE#30 localization fields (optional — older deployments omit them).
  name_source?: string | null;
  display_name?: string | null;
  canonical_name?: string | null;
  localized_names?: Record<string, string> | null;
  category: ItemCategory;
  color_main: string;
  status: ItemStatus;
  cover_image_url?: string | null;
  original_image_url?: string | null;
  cutout_status?: CutoutStatus | string;
  location?: string | null;
  size_label?: string | null;
  size_region?: string | null;
  fit_intent?: FitIntent | null;
  fit_status: FitStatus;
  comfort_score?: number | null;
  sub_category?: string | null;
  color_secondary?: string | null;
  material?: string | null;
  season_tags?: string[] | null;
  style_tags?: string[] | null;
  formality_score?: number | null;
  time_cost_level?: string | null;
  purchase_price?: number | null;
  wear_count?: number;
  last_worn?: string | null;
  purchase_date?: string | null;
  // FE#39 seam — optional, older deployments omit these.
  category_confidence?: number | null;
  color_confidence?: number | null;
}

export interface ListWardrobeItemsQuery {
  category?: ItemCategory | 'all';
  limit?: number;
  offset?: number;
}

export interface ListWardrobeItemsResponse {
  items: WardrobeItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface ServerListWardrobeItemsResponse {
  items: ServerWardrobeItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface UpdateWardrobeItemBody {
  name?: string | null;
  category?: ItemCategory | null;
  color?: string | null;
  status?: ItemStatus | null;
  location?: string | null;
  subCategory?: string | null;
  colorSecondary?: string | null;
  material?: string | null;
  seasonTags?: string[] | null;
  styleTags?: string[] | null;
  formalityScore?: number | null;
  timeCostLevel?: string | null;
  purchasePrice?: number | null;
}

export interface UpdateFitBody {
  sizeLabel?: string | null;
  sizeRegion?: string | null;
  fitIntent?: FitIntent | null;
  fitStatus?: FitStatus | null;
  comfortScore?: number | null;
}

export type TodayState = 'ready' | 'insufficient_items' | 'failed' | (string & NonNullable<unknown>);
export type OutfitVariant = 'safe' | 'fast' | 'stylish' | (string & NonNullable<unknown>);
export type TimeSensitivity = 'relaxed' | 'standard' | 'rushed' | 'instant' | (string & NonNullable<unknown>);

// BE#131 — what produced a persisted recommendation revision (drives learning
// attribution; see FE#130).
export type RecommendationGenerationSource =
  | 'nightly'
  | 'departure'
  | 'read_time'
  | 'refresh'
  | 'context_override'
  | 'tomorrow_preview'
  | 'midday_checkpoint'
  | (string & NonNullable<unknown>);

export interface OutfitItemBrief {
  id: string;
  name?: string | null;
  category?: ItemCategory | null;
  color?: string | null;
  thumbUrl?: string | null;
}

export interface OutfitReplacementCandidate {
  itemId: string;
  title: string;
  category: ItemCategory;
  colorMain: string;
  thumbnailUrl: string | null;
  similarity: number;
}

export interface ServerOutfitReplacementCandidate {
  item_id: string;
  title: string;
  category: ItemCategory;
  color_main: string;
  thumbnail_url?: string | null;
  similarity: number;
}

export interface ServerOutfitReplacementsResponse {
  replacements: ServerOutfitReplacementCandidate[];
}

// V3+ explainability — flag-gated. Field is null when the corresponding feature
// flag is off; client renders empty rather than asserting presence.
export interface OutfitScores {
  aesthetic: number;
  feasibility: number;
  fit: number;
  total: number;
  prepMinutes: number;
  rulesVersion: string;
}

export interface ServerOutfitScores {
  aesthetic: number;
  feasibility: number;
  fit: number;
  total: number;
  prep_minutes: number;
  rules_version: string;
}

export type ObstacleKind = 'laundry' | 'lost' | 'seasonal' | 'stale' | 'weather_mismatch';
export type ObstacleSeverity = 'blocking' | 'warning' | 'info';

export interface I18nMessage {
  key: string;
  params?: Record<string, unknown>;
  fallbackText: string;
}

export interface ServerI18nMessage {
  key: string;
  params?: Record<string, unknown>;
  fallback_text: string;
}

// Where a recommendation reason came from — drives the small provenance label
// on each reason row (redesign brief v0.9 §9.3). Optional everywhere: the BE
// currently returns reasons as plain text, so `source` is undefined until the
// contract adds it, in which case the label is simply not rendered.
export type RecommendationReasonSource =
  | 'weather_rule'
  | 'wardrobe_history'
  | 'preference_memory'
  | 'style_memory'
  | 'indoor_climate_inference'
  | 'llm';

export interface RecommendationReason {
  text: string;
  source?: RecommendationReasonSource;
  referencedItemIds?: string[];
}

export interface OutfitObstacle {
  kind: ObstacleKind;
  itemId: string;
  severity: ObstacleSeverity;
  title: I18nMessage;
  replacementCandidateIds: string[];
}

export interface ServerOutfitObstacle {
  kind: ObstacleKind;
  item_id: string;
  severity: ObstacleSeverity;
  title: ServerI18nMessage;
  replacement_candidate_ids?: string[] | null;
}

export interface OutfitSummary {
  id: string;
  variant: OutfitVariant;
  title: string;
  reason: string;
  timeSensitivity: TimeSensitivity;
  isFavorited: boolean;
  items: OutfitItemBrief[];
  scores?: OutfitScores | null;
  obstacles?: OutfitObstacle[] | null;
  prepSteps?: I18nMessage[] | null;
  prepNotes?: I18nMessage[] | null;
}

export interface StyleContext {
  templateId: string;
  activeTags: string[];
  confidence: number;
}

export interface WeatherContext {
  temperatureC: number;
  feelsLikeC: number;
  rainProbability: number;
  condition: string;
  // QWeather enrichments — optional; null on non-qweather providers / legacy snapshots.
  humidity?: number | null;
  windDir?: string | null;
  windScale?: string | null;
  windSpeed?: number | null;
  icon?: string | null;
  locationName?: string | null;
}

export interface ServerWeatherContext {
  temperature_c: number;
  feels_like_c: number;
  rain_probability: number;
  condition: string;
  humidity?: number | null;
  wind_dir?: string | null;
  wind_scale?: string | null;
  wind_speed?: number | null;
  icon?: string | null;
  location_name?: string | null;
}

export interface TodayContext {
  weather: WeatherContext | null;
  scene: string | null;
  fetchedAt: string | null;
}

export interface ServerTodayContext {
  weather?: ServerWeatherContext | null;
  scene?: string | null;
  fetched_at?: string | null;
}

export interface AppliedContext {
  overrideText: string | null;
  constraints: string[];
}

export interface TodayResurfaceInsight {
  id: string;
  text: string;
  itemId: string;
  reason: string;
  cooldownKey: string;
}

// BE#131 — stable recommendation identity/revision metadata. Additive and
// nullable on both Today and First Outfit: null on legacy rows persisted
// before BE#131, and on non-persisted fallback / no_outfit gate responses.
// FE#130 attributes passive-learning events (impression/swap) to this.
export interface RecommendationIdentity {
  recommendationId: string | null;
  revision: number | null;
  generatedAt: string | null;
  generationSource: RecommendationGenerationSource | null;
  traceId: string | null;
}

export interface ServerRecommendationIdentity {
  recommendation_id?: string | null;
  revision?: number | null;
  generated_at?: string | null;
  generation_source?: RecommendationGenerationSource | null;
  trace_id?: string | null;
}

export interface TodayRecommendation extends RecommendationIdentity {
  date: string;
  state: TodayState;
  guidanceText: string | null;
  countdownMinutes: number | null;
  outfits: OutfitSummary[];
  styleContext?: StyleContext | null;
  context?: TodayContext | null;
  appliedContext?: AppliedContext | null; // BE#78
  resurfaceInsight?: TodayResurfaceInsight | null; // BE#80
  mode?: 'today' | 'tomorrow' | null; // BE#77
}

export type OutfitDetail = OutfitSummary;

export interface ServerOutfitItemBrief {
  item_id: string;
  title?: string | null;
  category?: ItemCategory | null;
}

export interface ServerOutfitResponse {
  outfit_id: string;
  type: OutfitVariant;
  title: string;
  reason: string;
  time_sensitivity?: TimeSensitivity;
  is_favorited?: boolean;
  items: ServerOutfitItemBrief[];
  scores?: ServerOutfitScores | null;
  obstacles?: ServerOutfitObstacle[] | null;
  prep_steps?: ServerI18nMessage[] | null;
  prep_notes?: ServerI18nMessage[] | null;
}

// Favorite/unfavorite is an ack-only endpoint (BE returns `{ success }`); the
// resulting favorite state is the mutation's input, so the client derives it.
export interface ServerFavoriteOutfitResponse {
  success: boolean;
}

export interface ServerStyleContext {
  template_id: string;
  active_tags: string[];
  confidence: number;
}

// BE#78 — echo of the context override that shaped a refresh.
export interface ServerAppliedContext {
  override_text?: string | null;
  constraints: string[];
}

// BE#80 — at most one forgotten-item nudge; absent when no genuine candidate.
export interface ServerResurfaceInsight {
  id: string;
  text: string;
  item_id: string;
  reason: string;
  cooldown_key: string;
}

export interface ServerTodayRecommendation extends ServerRecommendationIdentity {
  recommendation_date: string;
  status: TodayState;
  guidance_text?: string | null;
  outfits: ServerOutfitResponse[];
  style_context?: ServerStyleContext | null;
  context?: ServerTodayContext | null;
  applied_context?: ServerAppliedContext | null; // BE#78
  resurface_insight?: ServerResurfaceInsight | null; // BE#80
  mode?: 'today' | 'tomorrow' | null; // BE#77 — null on legacy / flag-off payloads
}

// BE #79 — first-outfit cold-start feasibility gate. The verdict derives from
// the same daily the Today pipeline persists, so gate and /today never diverge.
export type FirstOutfitGateState = 'no_outfit' | 'single_outfit' | 'ready';

export interface ServerFirstOutfitGate extends ServerRecommendationIdentity {
  state: FirstOutfitGateState;
  feasible_outfit_count: number;
  missing_slots: string[];
  first_outfit?: ServerOutfitResponse | null;
  gate_failures: string[];
}

export interface FirstOutfitGate extends RecommendationIdentity {
  state: FirstOutfitGateState;
  feasibleOutfitCount: number;
  missingSlots: string[];
  firstOutfit: OutfitSummary | null;
  gateFailures: string[];
}

// V3+: 4-tier overall feedback. Old like/dislike still accepted.
export type FeedbackKind = 'love' | 'like' | 'neutral' | 'dislike';

export interface SendFeedbackBody {
  kind: FeedbackKind;
  reasonTags?: string[];
}

// Bundle: single-transaction overall + per-item feedback.
export interface FeedbackBundleItem {
  itemId: string;
  feedbackType: FitFeedbackType;
  scene?: FitScene | null;
  comfortScore?: number | null;
}

export interface FeedbackBundleBody {
  overall: SendFeedbackBody;
  items?: FeedbackBundleItem[];
}

export interface FeedbackBundleResult {
  written: number;
}

// Reason tag dictionary
export type FeedbackTagAppliesTo = 'overall' | 'item';

export interface FeedbackTag {
  key: string;
  labelZhCn: string;
  appliesTo: FeedbackTagAppliesTo[];
}

export interface ServerFeedbackTag {
  key: string;
  label_zh_cn: string;
  applies_to: FeedbackTagAppliesTo[];
}

export interface FeedbackTagsResponse {
  scene: string | null;
  tags: FeedbackTag[];
}

export interface ServerFeedbackTagsResponse {
  scene?: string | null;
  tags: ServerFeedbackTag[];
}

export interface FitFeedbackBody {
  itemId: string;
  outfitId?: string | null;
  feedbackType: FitFeedbackType;
  scene: FitScene;
}

export interface FitFeedbackResult {
  feedbackId: string;
  fitStatus: FitStatus;
}

export interface ServerFitFeedbackResponse {
  feedback_id: string;
  fit_status: FitStatus;
}

// Outfit history (date-filterable)
export interface OutfitHistoryEntry {
  outfitId: string;
  wornDate: string;
  outfitType: string;
  title: string;
  feedbackType?: string | null;
  reasonTags: string[];
}

export interface ServerOutfitHistoryItem {
  outfit_id: string;
  worn_date: string;
  outfit_type: string;
  title: string;
  feedback_type?: string | null;
  reason_tags: string[];
}

export interface ServerOutfitHistoryResponse {
  items: ServerOutfitHistoryItem[];
  limit: number;
  offset: number;
}

// Wear-history record for one date (GET /v1/outfit-history/{worn_date}); also
// the target of the OOTD photo attach (POST /v1/outfit-history/{id}/ootd).
export interface WearHistoryEntry {
  wearHistoryId: string;
  wornDate: string;
  outfit: {
    outfitId: string;
    outfitType: string;
    title: string | null;
    reasonText: string | null;
  } | null;
  ootdImageUrl: string | null;
  selectedAt: string;
}

export interface ServerWearHistoryEntry {
  wear_history_id: string;
  worn_date: string;
  outfit?: {
    outfit_id: string;
    outfit_type: string;
    title?: string | null;
    reason_text?: string | null;
  } | null;
  ootd_image_url?: string | null;
  selected_at: string;
}

export interface OutfitHistoryQuery {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Insights
export interface InsightsSummary {
  totalItems: number;
  activeRate: number;
  idleCount: number;
  idleThresholdDays: number;
  mostWornCategory?: string | null;
  favoriteColor?: string | null;
  wearHistoryCount?: number | null;
  hasSufficientWearHistory?: boolean | null;
  reportAvailable?: boolean | null;
}

export interface ServerInsightsSummary {
  total_items: number;
  active_rate: number;
  idle_count: number;
  idle_threshold_days: number;
  most_worn_category?: string | null;
  favorite_color?: string | null;
  wear_history_count?: number | null;
  has_sufficient_wear_history?: boolean | null;
  report_available?: boolean | null;
}

export interface TopItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  wearCount: number;
}

export interface ServerTopItem {
  item_id: string;
  title: string;
  category: string;
  cover_image_url?: string | null;
  wear_count: number;
}

export interface IdleItem extends TopItem {
  lastWorn?: string | null;
}

export interface ServerIdleItem extends ServerTopItem {
  last_worn?: string | null;
}

export interface ColorPalette {
  palette: Record<string, number>;
}

// V3+: per-item daily wear-history (drives ItemDetail heatmap)
export interface ItemWearHistory {
  itemId: string;
  days: number;
  dailyCounts: Record<string, number>;
  entries: { wornDate: string; outfitId: string; outfitType: string | null }[];
}

export interface ServerItemWearHistory {
  item_id: string;
  days: number;
  daily_counts: Record<string, number>;
  entries: { worn_date: string; outfit_id: string; outfit_type?: string | null }[];
}

// V3+: cost summary
export interface CostSummaryItem {
  used: number;
  limit: number;
  remaining: number;
}

export interface CostSummary {
  llmAsk: CostSummaryItem;
  ocrReceipt: CostSummaryItem;
  tryon: CostSummaryItem;
}

export interface ServerCostSummary {
  llm_ask: CostSummaryItem;
  ocr_receipt: CostSummaryItem;
  tryon: CostSummaryItem;
}

// V3+: account lifecycle
export interface DeactivateResult {
  deactivatedAt: string;
  scheduledPurgeAt: string;
  graceDays: number;
}

export interface ServerDeactivateResponse {
  deactivated_at: string;
  scheduled_purge_at: string;
  grace_days: number;
}

export interface DataExportResult {
  jobId: string;
  status: string;
  message: string;
}

export interface ServerDataExportResponse {
  job_id: string;
  status: string;
  message: string;
}

// V3+: STS for direct OSS upload
export type StsBucketAlias = 'items' | 'ootd' | 'private' | 'derived';
export type StsAction = 'upload' | 'read';

export interface StsTokenBody {
  bucketAlias?: StsBucketAlias;
  action?: StsAction;
}

export interface StsToken {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
  bucket: string;
  region: string;
  endpoint: string;
  objectKeyPrefix: string;
}

export interface ServerStsTokenResponse {
  access_key_id: string;
  access_key_secret: string;
  security_token: string;
  expiration: string;
  bucket: string;
  region: string;
  endpoint: string;
  object_key_prefix: string;
}

export type ImageContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PresignRequestBody {
  fileName: string;
  contentType: ImageContentType;
  maxContentLength: number;
}

export interface PresignResponse {
  uploadUrl: string;
  fileUrl: string;
  objectKey: string;
  // Non-empty => presigned POST (S3/minio multipart form). Empty => PUT (OSS/local).
  fields: Record<string, string>;
}

export interface ServerPresignResponse {
  upload_url: string;
  file_url: string;
  object_key: string;
  fields?: Record<string, string>;
}

export type ImportTaskStatus =
  | 'waiting_confirm'
  | 'completed'
  | 'failed'
  | 'processing'
  | (string & NonNullable<unknown>);

export interface ImportCandidateItem {
  // null for legacy/single payloads that carry no addressable temp id; such
  // candidates can't be batch-confirmed (no temp_item_id to reference).
  tempItemId: string | null;
  name: string;
  category: ItemCategory;
  colorMain: string;
  confidenceScore?: number;
  imageUrl: string | null;
  shouldImport: boolean;
}

export interface ImportTask {
  id: string;
  status: ImportTaskStatus;
  imageUrl: string | null;
  recognized?: {
    name?: string;
    category?: ItemCategory;
    color?: string;
    confidenceScore?: number;
  };
  // BE#24 — 1..N detected candidates. Always length >= 1 when there's any
  // candidate (single payloads map to length 1).
  candidateItems: ImportCandidateItem[];
  errorReason?: ImportFailureReason;
  errorMessage?: string | null;
}

export interface ServerImportCandidate {
  temp_item_id?: string | null;
  title?: string | null;
  display_name?: string | null;
  name?: string | null;
  category: ItemCategory;
  sub_category?: string | null;
  color_main: string;
  confidence_score?: number | null;
  original_image_url?: string | null;
  crop_image_url?: string | null;
  cutout_image_url?: string | null;
  should_import?: boolean | null;
}

export interface ServerImportTask {
  task_id: string;
  status: ImportTaskStatus;
  candidate_item?: {
    title: string;
    category: ItemCategory;
    color_main: string;
    confidence_score: number;
    original_image_url: string;
  } | null;
  candidate_items?: ServerImportCandidate[];
  error_code?: string | null;
  error_message?: string | null;
}

export interface ConfirmImportItemBody {
  tempItemId: string;
  title: string;
  category: ItemCategory;
  color: string;
  location?: string | null;
  sizeLabel?: string | null;
  fitStatus?: FitStatus | null;
}

export type ImportFailureReason =
  | 'upload_failed'
  | 'unsupported_format'
  | 'too_large'
  | 'recognition_failed'
  | 'network_error';

export type ImportInputType =
  | 'image'
  | 'link'
  | 'screenshot'
  | 'image_batch'
  | 'shared_content'
  | 'order_screenshot';

export type ImportSourceType =
  | 'camera'
  | 'album'
  | 'taobao'
  | 'jd'
  | 'xhs'
  | 'douyin'
  | 'web'
  | 'share'
  | 'screenshot';

export interface CreateImportTaskBody {
  inputType: ImportInputType;
  sourceType: ImportSourceType;
  imageUrl?: string;
  sourceUrl?: string;
  // BE#30: BCP-47 locale so vision recognition names come back localized.
  locale?: string;
}

export interface ConfirmImportTaskBody {
  name: string;
  category: ItemCategory;
  color: string;
  location?: string | null;
  sizeLabel?: string | null;
  fitStatus?: FitStatus | null;
}

export interface AuthTokenResponse {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

// ============================================================================
// V4 surface — ask / packing list / outfit calendar / shopping sense-check /
// style inspirations / OOTD poster / outfit visual assets / wardrobe report.
// These backend routers return the V3-style direct body (no envelope) except
// /style/* which wraps in ResponseModel; the client interceptor unwraps both.
// ============================================================================

// --- Ask Aidrobe (M15) -----------------------------------------------------

export interface AskContext {
  date?: string;
  scene?: string;
  timeLeftMinutes?: number;
}

// How the Ask screen was entered — drives context/history scoping.
export type AskScope = 'global' | 'item' | 'today';

export interface AskBody {
  question: string;
  context?: AskContext;
  focusedItemId?: string;
  locale?: string;
  // Thread id for multi-turn continuity. Pass the conversation_id returned by
  // the previous turn so the backend can include prior exchange context.
  conversationId?: string | null;
}

// BE#29 — denormalized snapshot of a referenced wardrobe item, already
// user-scoped / non-deleted / localized / signed by the server. Lets the
// client render the refs row without an N+1 of per-item detail fetches.
export interface ServerAskItemRefSnapshot {
  item_id: string;
  name: string;
  category: ItemCategory;
  color_main: string;
  thumbnail_url?: string | null;
}

export interface AskItemRefSnapshot {
  itemId: string;
  name: string;
  category: ItemCategory;
  colorMain: string;
  thumbnailUrl: string | null;
}

// Multi-turn reasoning deltas — what the conversation carried into this answer.
export interface AskDeltas {
  reasoning: string | null;
  appliedConstraints: string[];
}

export interface AskResult {
  askSessionId: string;
  conversationId: string | null;
  answer: string;
  itemRefs: string[];
  itemRefSnapshots: AskItemRefSnapshot[];
  tokensUsed: number;
  hasWardrobeContext: boolean;
  deltas: AskDeltas | null;
  recommendationId: string | null;
  sourceSurface: string;
}

export interface ServerAskDeltas {
  reasoning?: string | null;
  applied_constraints?: string[];
}

export interface ServerAskResponse {
  ask_session_id: string;
  conversation_id?: string | null;
  answer: string;
  item_refs: string[];
  item_ref_snapshots?: ServerAskItemRefSnapshot[];
  tokens_used: number;
  has_wardrobe_context?: boolean;
  deltas?: ServerAskDeltas | null;
  recommendation_id?: string | null;
  source_surface?: string;
}

export interface AskHistoryEntry {
  askSessionId: string;
  question: string;
  answer: string | null;
  itemRefs: string[];
  itemRefSnapshots: AskItemRefSnapshot[];
  createdAt: string;
}

export interface ServerAskHistoryItem {
  ask_session_id: string;
  question: string;
  answer?: string | null;
  item_refs?: string[];
  item_ref_snapshots?: ServerAskItemRefSnapshot[];
  created_at: string;
}

// --- Packing list (M16) ----------------------------------------------------

export type PackingListStatus = 'draft' | 'active' | 'archived' | (string & NonNullable<unknown>);

export interface PackingEntry {
  itemId: string;
  day: number;
  scene: string;
  notes: string;
  packed: boolean;
}

export interface ServerPackingItem {
  item_id: string;
  day: number;
  scene: string;
  notes: string;
  packed: boolean;
}

// BE#68 packing PLANNER (present only when ENABLE_PACKING_PLANNER is on). The
// free-text fields (summary / weatherSummary / reasoning / reason) are English-
// only on the wire; the FE renders LOCALIZED copy derived from the structured
// fields instead and does NOT display these strings (see PackingListDetailScreen).
export interface PackingPlanDailyOutfit {
  day: number;
  occasion: string;
  itemIds: string[];
  reasoning: string[];
}
export interface PackingPlanMissingItem {
  category: string;
  reason: string;
}
export interface PackingPlanPackingItem {
  itemId: string;
  role: string;
  reason: string;
}
export interface PackingPlan {
  summary: string;
  weatherSummary: string | null;
  packingItems: PackingPlanPackingItem[];
  dailyOutfits: PackingPlanDailyOutfit[];
  missingItems: PackingPlanMissingItem[];
}

export interface ServerPackingPlan {
  summary: string;
  weather_summary?: string | null;
  packing_items: { item_id: string; role: string; reason: string }[];
  daily_outfits: { day: number; occasion: string; item_ids: string[]; reasoning: string[] }[];
  missing_items: { category: string; reason: string }[];
}

export interface PackingList {
  id: string;
  destination: string | null;
  days: number | null;
  scenes: string[];
  departureDate: string | null;
  items: PackingEntry[];
  status: PackingListStatus;
  plan: PackingPlan | null;
}

export interface ServerPackingListResponse {
  packing_list_id: string;
  destination?: string | null;
  days?: number | null;
  scenes: string[];
  departure_date?: string | null;
  items: ServerPackingItem[];
  status: string;
  plan?: ServerPackingPlan | null;
}

export interface CreatePackingListBody {
  destination?: string;
  days: number;
  scenes: string[];
  weatherHint?: string;
  departureDate?: string;
}

export interface UpdatePackingListBody {
  items?: PackingEntry[];
  status?: string;
}

// --- Outfit plan / calendar (V4) -------------------------------------------

export type OutfitPlanStatus = 'planned' | 'cancelled' | (string & NonNullable<unknown>);

export interface OutfitPlan {
  id: string;
  outfitId: string;
  plannedDate: string;
  status: OutfitPlanStatus;
}

export interface ServerOutfitPlanResponse {
  outfit_plan_id: string;
  outfit_id: string;
  planned_date: string;
  status: string;
}

export interface WearPlanResult {
  outfitPlanId: string;
  wearHistoryId: string;
  wornDate: string;
  status: string;
}

export interface ServerWearPlanResponse {
  outfit_plan_id: string;
  wear_history_id: string;
  worn_date: string;
  status: string;
}

export interface CreateOutfitPlanBody {
  outfitId: string;
  plannedDate: string;
}

export interface UpdateOutfitPlanBody {
  plannedDate?: string;
  // Only "planned" (restore) or "cancelled" are accepted server-side.
  status?: 'planned' | 'cancelled';
}

// Calendar cells embed the lean outfit-history OutfitSummary shape.
export interface CalendarOutfit {
  outfitId: string;
  outfitType: string;
  title: string;
  reason: string | null;
}

export interface ServerCalendarOutfit {
  outfit_id: string;
  outfit_type: string;
  title: string;
  reason_text?: string | null;
}

export type CalendarCellKind = 'worn' | 'planned' | (string & NonNullable<unknown>);

export interface CalendarCell {
  kind: CalendarCellKind;
  outfit: CalendarOutfit | null;
  wearHistoryId: string | null;
  ootdImageUrl: string | null;
  outfitPlanId: string | null;
  status: string | null;
}

export interface ServerCalendarCell {
  kind: string;
  outfit?: ServerCalendarOutfit | null;
  wear_history_id?: string | null;
  ootd_image_url?: string | null;
  outfit_plan_id?: string | null;
  status?: string | null;
}

export interface CalendarDay {
  date: string;
  cells: CalendarCell[];
}

export interface ServerCalendarDay {
  date: string;
  cells: ServerCalendarCell[];
}

export interface ServerOutfitPlanCalendarResponse {
  days: ServerCalendarDay[];
}

export interface CalendarQuery {
  start: string;
  end: string;
}

// --- Shopping sense-check (M17) --------------------------------------------

export type SenseCheckVerdict = 'buy' | 'consider' | 'skip' | (string & NonNullable<unknown>);

export interface SimilarItem {
  itemId: string;
  similarity: number;
}

export interface ServerSimilarItem {
  item_id: string;
  similarity: number;
}

// BE#69 wardrobe-aware purchase evaluator. Present only when the server has
// ENABLE_PURCHASE_EVALUATOR on; null/absent otherwise (clean rollback).
export interface RedundancySimilarItem {
  itemId: string;
  similarity: number;
  reason: string;
}
export interface PurchaseRedundancy {
  level: string; // low | medium | high
  similarOwnedItems: RedundancySimilarItem[];
}
export interface WardrobeGapDetail {
  category: string;
  severity: string; // low | medium | high
}
export interface PurchaseDecisionFactor {
  factor: string;
  detail: string;
  direction: string; // buy | consider | skip | neutral
}
export interface PurchaseEvaluation {
  confidence?: number | null;
  redundancy?: PurchaseRedundancy | null;
  wardrobeGapDetail: WardrobeGapDetail[];
  factors: PurchaseDecisionFactor[];
  costPerWearHint?: string | null;
}

export interface ServerPurchaseEvaluation {
  confidence?: number | null;
  redundancy?: {
    level: string;
    similar_owned_items: { item_id: string; similarity: number; reason: string }[];
  } | null;
  wardrobe_gap_detail: { category: string; severity: string }[];
  factors: { factor: string; detail: string; direction: string }[];
  cost_per_wear_hint?: string | null;
}

export interface SenseCheckResult {
  verdict: SenseCheckVerdict;
  reason: string;
  displayReason?: I18nMessage | null;
  fallbackText?: string | null;
  similarItems: SimilarItem[];
  similarItemCount?: number | null;
  wardrobeGap: string[];
  outfitPotential: number;
  pairableCount?: number | null;
  evaluation?: PurchaseEvaluation | null;
}

export interface ServerSenseCheckResponse {
  verdict: string;
  reason: string;
  display_reason?: ServerI18nMessage | null;
  fallback_text?: string | null;
  similar_items: ServerSimilarItem[];
  similar_item_count?: number | null;
  wardrobe_gap: string[];
  outfit_potential: number;
  pairable_count?: number | null;
  evaluation?: ServerPurchaseEvaluation | null;
}

export interface SenseCheckBody {
  imageUrl?: string;
  sourceUrl?: string;
  // Optional price → BE computes the cost-per-wear hint when provided.
  price?: number;
}

export interface SenseCheckHistoryEntry extends SenseCheckResult {
  id: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  createdAt: string;
}

export interface ServerSenseCheckHistoryItem {
  sense_check_id: string;
  verdict: string;
  reason: string;
  display_reason?: ServerI18nMessage | null;
  fallback_text?: string | null;
  image_url: string | null;
  source_url: string | null;
  similar_items: ServerSimilarItem[];
  similar_item_count?: number | null;
  wardrobe_gap: string[];
  outfit_potential: number;
  pairable_count?: number | null;
  evaluation?: ServerPurchaseEvaluation | null;
  created_at: string;
}

export interface ServerSenseCheckHistoryResponse {
  items: ServerSenseCheckHistoryItem[];
}

// --- Style inspirations / PDF ingest (M18 / M19) ---------------------------

export interface Inspiration {
  id: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceType: string;
  learnStatus: string;
  createdAt: string;
}

export interface ServerInspirationResponse {
  id: string;
  image_url: string | null;
  source_url?: string | null;
  source_type: string;
  learn_status?: string;
  created_at: string;
}

export interface InspirationList {
  items: Inspiration[];
  limit: number;
  offset: number;
}

export interface ServerInspirationListResponse {
  items: ServerInspirationResponse[];
  limit: number;
  offset: number;
}

export interface ServerBatchInspirationResponse {
  items: ServerInspirationResponse[];
}

export interface AddInspirationBody {
  imageUrl?: string;
  sourceUrl?: string;
}

export interface PdfStyleSourceBody {
  fileUrl: string;
  title?: string;
}

export interface PdfStyleSourceResult {
  sourceId: string;
  status: string;
  estimatedPages: number;
}

export interface ServerPdfStyleSourceResponse {
  source_id: string;
  status: string;
  estimated_pages: number;
}

export interface InspirationListQuery {
  limit?: number;
  offset?: number;
}

// Current user's style tags (read side; PATCH /style/tags is the write side).
export interface ServerStyleTagsResponse {
  tags: string[];
}

// --- OOTD poster (V4) ------------------------------------------------------

export type OotdPosterTemplate = 'minimal' | 'studio' | 'street';

export interface CreateOotdPosterBody {
  ootdImageUrl?: string;
  wearHistoryId?: string;
  templateId?: OotdPosterTemplate;
  // Must be true after the consent + "AI preview only" notice is shown.
  consent: boolean;
}

export interface OotdPosterResult {
  assetId: string;
  generationStatus: string;
  disclaimer: string;
}

export interface ServerCreateOotdPosterResponse {
  asset_id: string;
  generation_status: string;
  disclaimer: string;
}

// --- Outfit visual assets / signed URLs (M10 / E5) -------------------------
// E5: image_url is a short-lived signed URL (~30 min TTL) when the backend
// storage is private. DO NOT persist these past the session — re-fetch via the
// parent endpoint when the TTL elapses.

export interface OutfitVisualAsset {
  assetId: string;
  generationStatus: string;
  imageUrl: string | null;
  visualType: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface ServerOutfitVisualAssetResponse {
  asset_id: string;
  generation_status: string;
  image_url?: string | null;
  visual_type?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface WardrobeItemImage {
  imageType: string;
  imageUrl: string | null;
}

export interface WardrobeItemImages {
  itemId: string;
  images: WardrobeItemImage[];
}

export interface ServerWardrobeItemImage {
  image_type: string;
  image_url: string | null;
}

export interface ServerWardrobeItemImagesResponse {
  item_id: string;
  images: ServerWardrobeItemImage[];
}

// --- Insights extension: style trend / cost-per-wear / wardrobe report ------

export interface StyleTrendEntry {
  yearMonth: string;
  tags: Record<string, number>;
}

export interface ServerStyleTrendEntry {
  year_month: string;
  tags: Record<string, number>;
}

export interface ServerStyleTrendResponse {
  trend: ServerStyleTrendEntry[];
}

export interface CostPerWearItem {
  itemId: string;
  title: string;
  purchasePrice: number | null;
  wearCount: number;
  costPerWear: number | null;
}

export interface ServerCostPerWearItem {
  item_id: string;
  title: string;
  // Backend Decimal → Pydantic v2 serializes to a JSON string (verified via
  // openapi.yaml: anyOf[string, null]). Convert to number client-side.
  purchase_price?: string | null;
  wear_count: number;
  cost_per_wear?: string | null;
}

// M21: half-year / annual "wardrobe wrapped" report. Gated by
// ENABLE_WARDROBE_REPORT (503 when off). `period` is like "2026-H1".
export interface ReportTopItem {
  itemId: string;
  title: string;
  category: string;
  coverImageUrl: string | null;
  wearCount: number;
}

export interface ServerReportTopItem {
  item_id: string;
  title: string;
  category: string;
  cover_image_url?: string | null;
  wear_count: number;
}

export interface ReportOutfitCombo {
  outfitId: string;
  title: string;
  wearCount: number;
}

export interface ServerReportOutfitCombo {
  outfit_id: string;
  title: string;
  wear_count: number;
}

export interface ReportCostPerWear {
  itemId: string;
  title: string;
  purchasePrice: number;
  wearCount: number;
  costPerWear: number;
}

export interface ServerReportCostPerWear {
  item_id: string;
  title: string;
  // Required Decimal → JSON string (openapi.yaml: type string). Convert client-side.
  purchase_price: string;
  wear_count: number;
  cost_per_wear: string;
}

export interface ReportIdleItem {
  itemId: string;
  title: string;
  category: string;
  coverImageUrl: string | null;
  lastWorn: string | null;
  idleDays: number | null;
}

export interface ServerReportIdleItem {
  item_id: string;
  title: string;
  category: string;
  cover_image_url?: string | null;
  last_worn?: string | null;
  idle_days?: number | null;
}

export interface ReportStyleTrend {
  period: string;
  prevPeriod: string;
  current: Record<string, number>;
  previous: Record<string, number>;
  rising: string[];
  fading: string[];
}

export interface ServerReportStyleTrend {
  period: string;
  prev_period: string;
  current: Record<string, number>;
  previous: Record<string, number>;
  rising: string[];
  fading: string[];
}

export interface WardrobeReport {
  period: string;
  label: string;
  startDate: string;
  endDate: string;
  isEmpty: boolean;
  totalWears: number;
  prevTotalWears: number;
  topItems: ReportTopItem[];
  topCombos: ReportOutfitCombo[];
  colorPalette: Record<string, number>;
  styleKeywords: string[];
  styleTrend: ReportStyleTrend | null;
  highestCostPerWear: ReportCostPerWear | null;
  longestIdleItem: ReportIdleItem | null;
  recommendationAdoptionRate: number;
  shareAssetUrl: string | null;
}

export interface ServerWardrobeReportResponse {
  period: string;
  label: string;
  start_date: string;
  end_date: string;
  is_empty: boolean;
  total_wears: number;
  prev_total_wears: number;
  top_items: ServerReportTopItem[];
  top_combos: ServerReportOutfitCombo[];
  color_palette: Record<string, number>;
  style_keywords: string[];
  style_trend?: ServerReportStyleTrend | null;
  highest_cost_per_wear?: ServerReportCostPerWear | null;
  longest_idle_item?: ServerReportIdleItem | null;
  recommendation_adoption_rate: number;
  share_asset_url?: string | null;
  poster_url?: string | null;
}

// --- Wardrobe health (FE #46 / BE #49) -----------------------------------
// GET /v1/insights/wardrobe-health is a V3 endpoint: returns data DIRECTLY
// (no {code,message,data} envelope), behind ENABLE_WARDROBE_HEALTH (503 off).
// The server intentionally returns STABLE CODES + NUMERIC METRICS ONLY — no
// copy — so the FE owns localization. The known codes (level: great|good|fair|
// low; type: wear_coverage|unused_items|category_balance|data_sparsity;
// severity: low|medium|high) live as runtime sets in the localizer helper; the
// response fields below are typed `string` so an unknown server code never
// breaks typing — it degrades to a generic localized fallback at render time,
// like the enum localizers in domainLabels.ts.

// Metrics are passed through verbatim — keys are already flat snake-free codes,
// so there is no server/client name mapping. `counts` maps category -> count.
export interface WardrobeHealthMetrics {
  coverage_ratio?: number;
  window_days?: number;
  unused_60?: number;
  unused_90?: number;
  unused_180?: number;
  dominant_ratio?: number;
  counts?: Record<string, number>;
  item_count?: number;
}

// `type` / `severity` are typed `string` (not the literal unions) so an unknown
// server code is representable and degrades gracefully; the helper narrows them.
export interface WardrobeHealthInsight {
  type: string;
  severity: string;
  metrics: WardrobeHealthMetrics;
}

export interface WardrobeHealth {
  score: number;
  level: string;
  insights: WardrobeHealthInsight[];
}
