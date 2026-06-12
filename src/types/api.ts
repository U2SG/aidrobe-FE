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

export interface UserSettings {
  departureTime: string | null;
  deviceToken?: string | null;
  pushEnabled?: boolean | null;
  location?: string | null;
}

export interface ServerUserSettings {
  departure_time?: string | null;
  device_token?: string | null;
  push_enabled?: boolean | null;
  location?: string | null;
}

export interface UpdateUserSettingsBody {
  departureTime?: string | null;
  deviceToken?: string | null;
  pushEnabled?: boolean | null;
  location?: string | null;
}

export interface WardrobeItem {
  id: string;
  name: string;
  category: ItemCategory;
  color: string;
  imageUrl: string | null;
  status: ItemStatus;
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
}

export interface ServerWardrobeItem {
  item_id: string;
  title: string;
  category: ItemCategory;
  color_main: string;
  status: ItemStatus;
  cover_image_url?: string | null;
  original_image_url?: string | null;
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

export interface OutfitItemBrief {
  id: string;
  name?: string | null;
  category?: ItemCategory | null;
  color?: string | null;
  thumbUrl?: string | null;
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
}

export interface ServerWeatherContext {
  temperature_c: number;
  feels_like_c: number;
  rain_probability: number;
  condition: string;
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

export interface TodayRecommendation {
  date: string;
  state: TodayState;
  guidanceText: string | null;
  countdownMinutes: number | null;
  outfits: OutfitSummary[];
  styleContext?: StyleContext | null;
  context?: TodayContext | null;
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
  items: ServerOutfitItemBrief[];
  scores?: ServerOutfitScores | null;
  obstacles?: ServerOutfitObstacle[] | null;
  prep_steps?: ServerI18nMessage[] | null;
  prep_notes?: ServerI18nMessage[] | null;
}

export interface ServerStyleContext {
  template_id: string;
  active_tags: string[];
  confidence: number;
}

export interface ServerTodayRecommendation {
  recommendation_date: string;
  status: TodayState;
  guidance_text?: string | null;
  outfits: ServerOutfitResponse[];
  style_context?: ServerStyleContext | null;
  context?: ServerTodayContext | null;
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
}

export interface ServerInsightsSummary {
  total_items: number;
  active_rate: number;
  idle_count: number;
  idle_threshold_days: number;
  most_worn_category?: string | null;
  favorite_color?: string | null;
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
  errorReason?: ImportFailureReason;
  errorMessage?: string | null;
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
  error_code?: string | null;
  error_message?: string | null;
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
  | 'shared_content';

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
