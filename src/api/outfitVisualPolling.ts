import type { OutfitVisualAsset } from '@/types/api';

export type WaitForOutfitVisualAssetOptions = {
  fetchAsset: (assetId: string) => Promise<OutfitVisualAsset>;
  intervalMs?: number;
  maxPolls?: number;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
};

const FAILED_ASSET_STATUSES = new Set(['failed', 'cancelled', 'canceled', 'rejected', 'error']);

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasCompletedImage(
  asset: OutfitVisualAsset,
): asset is OutfitVisualAsset & { imageUrl: string } {
  return asset.generationStatus === 'completed' && Boolean(asset.imageUrl);
}

function isFailedAsset(asset: OutfitVisualAsset): boolean {
  return FAILED_ASSET_STATUSES.has(asset.generationStatus.toLowerCase());
}

async function fetchBeforeDeadline(
  fetchAsset: (assetId: string) => Promise<OutfitVisualAsset>,
  assetId: string,
  timeoutMs: number,
): Promise<OutfitVisualAsset | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetchAsset(assetId),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

// Keep signed URLs in memory only. Unknown statuses keep polling so future
// in-progress states remain compatible without a client release.
export async function waitForOutfitVisualAsset(
  initialAsset: OutfitVisualAsset,
  {
    fetchAsset,
    intervalMs = 900,
    maxPolls = 10,
    sleep = defaultSleep,
    timeoutMs = 10_000,
  }: WaitForOutfitVisualAssetOptions,
): Promise<string | null> {
  let asset = initialAsset;
  const polls = Math.max(0, Math.floor(maxPolls));
  const deadline = Date.now() + Math.max(0, timeoutMs);

  if (hasCompletedImage(asset)) return asset.imageUrl;
  if (!asset.assetId || isFailedAsset(asset)) return null;

  for (let poll = 0; poll < polls; poll += 1) {
    try {
      const remainingBeforeSleep = deadline - Date.now();
      if (remainingBeforeSleep <= 0) return null;
      await sleep(Math.min(intervalMs, remainingBeforeSleep));
    } catch {
      return null;
    }

    const remainingBeforeFetch = deadline - Date.now();
    if (remainingBeforeFetch <= 0) return null;
    const nextAsset = await fetchBeforeDeadline(fetchAsset, asset.assetId, remainingBeforeFetch);
    if (!nextAsset) return null;
    asset = nextAsset;

    if (hasCompletedImage(asset)) return asset.imageUrl;
    if (isFailedAsset(asset)) return null;
  }

  return null;
}
