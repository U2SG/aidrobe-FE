import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import Constants from 'expo-constants';

import { useAuthStore } from '@/store/auth';
import { useDevUserStore } from '@/store/devUser';
import { useToastStore } from '@/store/toast';
import type { ApiEnvelope } from '@/types/api';

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL: string = extra.API_BASE_URL ?? 'http://localhost:8000';
export const APP_ENV: 'development' | 'staging' | 'production' = extra.APP_ENV ?? 'development';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
    return config;
  }

  if (APP_ENV !== 'production') {
    const userId = useDevUserStore.getState().userId;
    if (userId) {
      config.headers.set('X-User-Id', userId);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiEnvelope<unknown>>) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      if (body.code === 0 || body.code === 200) {
        return { ...response, data: body.data } as AxiosResponse<unknown>;
      }
      return Promise.reject(new ApiBusinessError(body.code, body.message ?? '业务错误'));
    }
    return response;
  },
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    handleHttpError(error);
    return Promise.reject(error);
  },
);

export class ApiBusinessError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiBusinessError';
  }
}

function handleHttpError(error: AxiosError<ApiEnvelope<unknown>>) {
  const status = error.response?.status;
  const message = error.response?.data?.message ?? '';
  const showToast = useToastStore.getState().show;

  if (status === 401) {
    // V3+ E1: account deactivated → wipe local tokens and let UI redirect to login.
    if (message.includes('Account deactivated') || message.includes('deactivated')) {
      void useAuthStore.getState().clear();
      showToast({ message: '账号已注销，请重新登录', kind: 'error' });
      return;
    }
    showToast({ message: '登录已过期，请重新登录', kind: 'error' });
    return;
  }
  if (status === 403) {
    showToast({ message: '没有权限执行该操作', kind: 'error' });
    return;
  }
  if (status === 422) {
    showToast({ message: message || '请求参数有误', kind: 'error' });
    return;
  }
  if (status === 429) {
    // V3+ D3: today refresh limit. Per-feature messaging is the caller's job;
    // this is just the generic fallback.
    showToast({ message: message || '操作太频繁，请稍后再试', kind: 'error' });
    return;
  }
  if (status === 503) {
    // V3+: feature flag disabled — should never happen for shipping clients.
    showToast({ message: '功能暂未开放', kind: 'error' });
    return;
  }
  if (status && status >= 500) {
    showToast({ message: '服务异常，请稍后重试', kind: 'error' });
    return;
  }
  if (!status) {
    const detail = APP_ENV === 'production' ? '' : `：${error.message} @ ${API_BASE_URL}`;
    showToast({ message: `网络异常，请检查连接${detail}`, kind: 'error' });
  }
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const res = await apiClient.get<T>(url, { params });
  return res.data;
}

export async function apiPost<T>(url: string, body?: unknown, params?: Record<string, unknown>) {
  const res = await apiClient.post<T>(url, body, params ? { params } : undefined);
  return res.data;
}

export async function apiPatch<T>(url: string, body?: unknown) {
  const res = await apiClient.patch<T>(url, body);
  return res.data;
}

export async function apiDelete<T>(url: string) {
  const res = await apiClient.delete<T>(url);
  return res.data;
}
