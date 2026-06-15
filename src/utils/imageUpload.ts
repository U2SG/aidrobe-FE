import * as ImagePicker from 'expo-image-picker';

import { createPresignedUpload, uploadToPresigned } from '@/api/uploads';
import { compressImage, MAX_UPLOAD_BYTES } from '@/utils/image';

export type PickedUpload = { uri: string; url: string };

/**
 * Pick one image from the album, compress, and upload via presign.
 * Returns `{ uri (local preview), url (uploaded fileUrl) }`, or `null` if the
 * user cancelled. Throws `Error('permission' | 'too_large')` or a network error
 * — callers map these to a toast.
 */
export async function pickAndUploadImage(filePrefix = 'upload'): Promise<PickedUpload | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('permission');

  const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
  if (result.canceled || !result.assets[0]) return null;

  const compressed = await compressImage(result.assets[0].uri);
  const blob = await fetch(compressed.uri).then((r) => r.blob());
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('too_large');

  const presign = await createPresignedUpload({
    fileName: `${filePrefix}-${Date.now()}.jpg`,
    contentType: 'image/jpeg',
    maxContentLength: Math.max(blob.size, 1),
  });
  await uploadToPresigned(presign, 'image/jpeg', blob);
  return { uri: compressed.uri, url: presign.fileUrl };
}

/** Map a pickAndUploadImage rejection to a user-facing message. */
export function uploadErrorMessage(err: unknown): string {
  const m = (err as Error)?.message;
  if (m === 'permission') return '需要相册权限';
  if (m === 'too_large') return '图片过大，请换一张';
  return '上传失败，请重试';
}
