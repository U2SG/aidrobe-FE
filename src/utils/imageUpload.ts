import * as ImagePicker from 'expo-image-picker';

import { createPresignedUpload, uploadFileUriToPresigned } from '@/api/uploads';
import { compressImage, MAX_UPLOAD_BYTES } from '@/utils/image';

export type PickedUpload = { uri: string; url: string };

/**
 * Pick one image from the album, compress, and upload via presign.
 * Returns `{ uri (local preview), url (uploaded fileUrl) }`, or `null` if the
 * user cancelled. Throws `Error('permission')` or a network/upload error —
 * callers map these to a toast. Size is enforced server-side via the presign
 * `maxContentLength`, so there's no client-side `too_large` reject anymore.
 */
export async function pickAndUploadImage(filePrefix = 'upload'): Promise<PickedUpload | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('permission');

  const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
  if (result.canceled || !result.assets[0]) return null;

  const compressed = await compressImage(result.assets[0].uri);
  const fileName = `${filePrefix}-${Date.now()}.jpg`;
  const presign = await createPresignedUpload({
    fileName,
    contentType: 'image/jpeg',
    maxContentLength: MAX_UPLOAD_BYTES,
  });
  await uploadFileUriToPresigned(presign, 'image/jpeg', compressed.uri, fileName);
  return { uri: compressed.uri, url: presign.fileUrl };
}

/** Map a pickAndUploadImage rejection to a user-facing message. */
export function uploadErrorMessage(err: unknown): string {
  const m = (err as Error)?.message;
  if (m === 'permission') return '需要相册权限';
  if (m === 'too_large') return '图片过大，请换一张';
  return '上传失败，请重试';
}
