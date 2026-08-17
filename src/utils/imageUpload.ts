import * as ImagePicker from 'expo-image-picker';

import { createPresignedUpload, uploadFileUriToPresigned } from '@/api/uploads';
import { compressImage, MAX_UPLOAD_BYTES } from '@/utils/image';

export type PickedUpload = { uri: string; url: string; objectKey: string };

/**
 * Pick one image from the album, compress, and upload via presign.
 * Returns `{ uri (local preview), url (uploaded fileUrl), objectKey }`, or
 * `null` if the user cancelled. Throws `Error('permission')` or a network/upload
 * error — callers map these to a toast. Size is enforced server-side via the
 * presign `maxContentLength`, so there's no client-side `too_large` reject
 * anymore.
 *
 * `objectKey` is the DURABLE storage reference; `url` is a TTL-bound read URL.
 * V3's purchase-candidate contract (§5.2 `source_asset_id`) requires the former
 * — a signed URL must never be persisted as truth.
 */
export async function pickAndUploadImage(filePrefix = 'upload'): Promise<PickedUpload | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('permission');

  const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
  if (result.canceled || !result.assets[0]) return null;

  return uploadLocalImage(result.assets[0].uri, filePrefix);
}

/**
 * Compress and upload one already-chosen local image; returns the same triple
 * as `pickAndUploadImage`.
 *
 * Split out for V3-015, whose picker is a separate port (album *and* camera,
 * with denial and cancellation as return values — `utils/personPhotoPicker.ts`).
 * The alternative was a second copy of the compress + presign + PUT sequence,
 * i.e. a second place for the presigned-host rewrite this repo's CLAUDE.md warns
 * about to be forgotten. Behavior of the existing caller is unchanged.
 */
export async function uploadLocalImage(
  uri: string,
  filePrefix = 'upload',
): Promise<PickedUpload> {
  const compressed = await compressImage(uri);
  const fileName = `${filePrefix}-${Date.now()}.jpg`;
  const presign = await createPresignedUpload({
    fileName,
    contentType: 'image/jpeg',
    maxContentLength: MAX_UPLOAD_BYTES,
  });
  await uploadFileUriToPresigned(presign, 'image/jpeg', compressed.uri, fileName);
  return { uri: compressed.uri, url: presign.fileUrl, objectKey: presign.objectKey };
}

/** Map a pickAndUploadImage rejection to a user-facing message. */
export function uploadErrorMessage(err: unknown): string {
  const m = (err as Error)?.message;
  if (m === 'permission') return '需要相册权限';
  if (m === 'too_large') return '图片过大，请换一张';
  return '上传失败，请重试';
}
