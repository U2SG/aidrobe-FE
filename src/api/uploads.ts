import axios from 'axios';

import { apiPost } from './client';
import type {
  PresignRequestBody,
  PresignResponse,
  ServerPresignResponse,
  ServerStsTokenResponse,
  StsToken,
  StsTokenBody,
} from '@/types/api';

export async function createPresignedUpload(body: PresignRequestBody) {
  const data = await apiPost<ServerPresignResponse>('/v1/uploads/presign', {
    file_name: body.fileName,
    content_type: body.contentType,
    max_content_length: body.maxContentLength,
  });
  return {
    uploadUrl: data.upload_url,
    fileUrl: data.file_url,
    objectKey: data.object_key,
    fields: data.fields ?? {},
  } satisfies PresignResponse;
}

// V3+ E5 — narrow-scoped STS for direct-to-OSS upload (skips backend bandwidth).
// Token TTL ~15min; key prefix is locked to `users/<your-uuid>/<action>/`.
// Falls back to /v1/uploads/presign when ENABLE_OSS_STS is off (returns 503).
export async function issueStsToken(body: StsTokenBody = {}): Promise<StsToken> {
  const data = await apiPost<ServerStsTokenResponse>('/v1/uploads/sts-token', {
    bucket_alias: body.bucketAlias ?? 'items',
    action: body.action ?? 'upload',
  });
  return {
    accessKeyId: data.access_key_id,
    accessKeySecret: data.access_key_secret,
    securityToken: data.security_token,
    expiration: data.expiration,
    bucket: data.bucket,
    region: data.region,
    endpoint: data.endpoint,
    objectKeyPrefix: data.object_key_prefix,
  };
}

// Upload the file to whatever the presign returned. When `fields` is non-empty
// the upload_url is an S3/minio presigned POST (multipart form, fields then file);
// otherwise it's a presigned PUT (Aliyun OSS / local). One call covers both.
export async function uploadToPresigned(
  presign: PresignResponse,
  contentType: string,
  body: Blob,
  onProgress?: (percent: number) => void,
) {
  const onUploadProgress = (event: { total?: number; loaded: number }) => {
    if (onProgress && event.total) {
      onProgress(Math.round((event.loaded / event.total) * 100));
    }
  };

  const fieldEntries = Object.entries(presign.fields ?? {});
  if (fieldEntries.length > 0) {
    const form = new FormData();
    // S3 presigned POST requires the form fields before the file part.
    for (const [key, value] of fieldEntries) form.append(key, value);
    form.append('file', body);
    // Let the browser set the multipart boundary; don't force Content-Type.
    await axios.post(presign.uploadUrl, form, { onUploadProgress });
    return;
  }

  await axios.put(presign.uploadUrl, body, {
    headers: { 'Content-Type': contentType },
    onUploadProgress,
  });
}

// Kept for callers that already hold a bare PUT url (e.g. OSS STS direct upload).
export async function putToPresignedUrl(
  uploadUrl: string,
  contentType: string,
  body: Blob | ArrayBuffer | Uint8Array,
  onProgress?: (percent: number) => void,
) {
  await axios.put(uploadUrl, body, {
    headers: { 'Content-Type': contentType },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
}
