import { Share } from 'react-native';

// Share `message`, appending `assetUrl` so Android (which drops Share's iOS-only
// `url`) still gets the link; pass `url` for iOS rich preview. Swallows the
// throw (user-dismissed vs failure isn't reliably distinguishable from Share).
export async function shareWithAsset(message: string, assetUrl?: string | null): Promise<void> {
  try {
    await Share.share(assetUrl ? { message: `${message}\n${assetUrl}`, url: assetUrl } : { message });
  } catch {
    // no-op: dismissed or unavailable
  }
}
