import axios from 'axios';

import { API_BASE_URL, apiPost } from './client';
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
    uploadUrl: normalizePresignedUploadUrl(data.upload_url, data.file_url),
    fileUrl: data.file_url,
    objectKey: data.object_key,
    fields: data.fields ?? {},
  } satisfies PresignResponse;
}

const INTERNAL_UPLOAD_HOSTS = new Set(['minio', 'localhost', '127.0.0.1', '0.0.0.0']);

function normalizePresignedUploadUrl(uploadUrl: string, fileUrl: string) {
  try {
    const upload = new URL(uploadUrl);
    if (!INTERNAL_UPLOAD_HOSTS.has(upload.hostname)) return uploadUrl;

    const publicUrl = new URL(fileUrl || API_BASE_URL);
    upload.protocol = publicUrl.protocol;
    upload.hostname = publicUrl.hostname;
    upload.port = publicUrl.port || upload.port;
    return upload.toString();
  } catch {
    return uploadUrl;
  }
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

export async function uploadFileUriToPresigned(
  presign: PresignResponse,
  contentType: string,
  fileUri: string,
  fileName: string,
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
    for (const [key, value] of fieldEntries) form.append(key, value);
    form.append('file', {
      uri: fileUri,
      name: fileName,
      type: contentType,
    } as unknown as Blob);
    await uploadFormDataWithXHR(presign.uploadUrl, form, onProgress);
    return;
  }

  // Presigned PUT (Aliyun OSS / local): no form fields. RN only streams the
  // `{uri,name,type}` shape inside FormData — a bare PUT body must be the
  // actual bytes, so read the file into a Blob first. (Passing the uri object
  // straight to axios.put serializes it to JSON and uploads no image at all.)
  const blob = await fetch(fileUri).then((r) => r.blob());
  await axios.put(presign.uploadUrl, blob, {
    headers: { 'Content-Type': contentType },
    onUploadProgress,
  });
}

function uploadFormDataWithXHR(
  url: string,
  form: FormData,
  onProgress?: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`upload_failed:${xhr.status}:${xhr.responseText?.slice(0, 160) ?? ''}`));
    };
    xhr.onerror = () => reject(new Error('upload_network_error'));
    xhr.ontimeout = () => reject(new Error('upload_timeout'));
    xhr.timeout = 60_000;
    xhr.send(form);
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
