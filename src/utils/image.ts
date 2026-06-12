import * as ImageManipulator from 'expo-image-manipulator';

/** 文档 §7 要求：单张压缩后 ≤ 1MB；这里默认 1600 长边 + 0.8 质量 */
export async function compressImage(uri: string) {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
