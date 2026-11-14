import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Shares a rendered outfit board as an image FILE, not its URL. The board URL
// is a short-lived signed link (~30 min) that Android share targets receive as
// bare text and that dies for anyone opening it later, so the picture itself
// is downloaded to the cache, handed to the system share sheet, then removed.
// Returns false when the image could not be shared (no share sheet, download
// failed); the caller then falls back to the text summary.
export async function shareBoardImage(imageUrl: string, dialogTitle: string): Promise<boolean> {
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) return false;
  const fileUri = `${FileSystem.cacheDirectory}outfit-board-${Date.now()}.jpg`;
  try {
    const download = await FileSystem.downloadAsync(imageUrl, fileUri);
    if (download.status < 200 || download.status >= 300) return false;
    await Sharing.shareAsync(download.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle });
    return true;
  } catch {
    return false;
  } finally {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);
  }
}
