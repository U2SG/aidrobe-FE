import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Constants from 'expo-constants';

import { isErrorToastSilenced } from '@/api/errorToast';
import { currentV3FlowId, V3_FLOW_ID_HEADER } from '@/api/v3Flow';
import { queryClient } from '@/core/providers/queryClient';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { useDevUserStore } from '@/store/devUser';
import { useToastStore } from '@/store/toast';
import type { ApiEnvelope } from '@/types/api';

// Per-request opt-out for the global error toast. Callers whose surface already
// hides itself on error (optional / feature-flagged cards) set this so a 503
// (flag off) or any failure fails quietly. Honored in `handleHttpError`.
declare module 'axios' {
  interface AxiosRequestConfig {
    silentErrorToast?: boolean;
    // Internal — marks a request that was already replayed after a token refresh.
    // A 401 on a retry must NOT trigger another refresh (loop guard).
    _isRetry?: boolean;
  }
}

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL: string = extra.API_BASE_URL ?? 'http://localhost:8000';
export const APP_ENV: 'development' | 'staging' | 'production' = extra.APP_ENV ?? 'development';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  // V3-008: while a "should I buy this" flow is active, every request carries
  // its flow id so BE-emitted analytics join the FE events of the same flow
  // (V3-002 event contract; the BE CorrelationIdMiddleware already accepts and
  // propagates this header, so no API shape changes).
  const flowId = currentV3FlowId();
  if (flowId && !config.headers.has(V3_FLOW_ID_HEADER)) {
    config.headers.set(V3_FLOW_ID_HEADER, flowId);
  }

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

// Single-flight refresh promise shared across concurrent 401s.
let refreshPromise: Promise<void> | null = null;

/**
 * Perform a full sign-out reset: clears auth tokens, resets onboarding state
 * (so RootNavigator flips back to Welcome), and clears the React Query cache.
 * Shows the "session expired" toast.
 */
async function signOutReset(): Promise<void> {
  const showToast = useToastStore.getState().show;
  await useAuthStore.getState().clear();
  useOnboardingStore.getState().setCompleted(false);
  queryClient.clear();
  showToast({ message: '登录已过期，请重新登录', kind: 'error' });
}

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
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message ?? '';
    const config = error.config;

    // ── 401 handling ─────────────────────────────────────────────────────────
    if (status === 401) {
      // V3+ E1: account deactivated — keep existing behavior unchanged.
      if (message.includes('Account deactivated') || message.includes('deactivated')) {
        const showToast = useToastStore.getState().show;
        void useAuthStore.getState().clear();
        showToast({ message: '账号已注销，请重新登录', kind: 'error' });
        return Promise.reject(error);
      }

      // Auth endpoints themselves are excluded from refresh (would loop).
      const isAuthEndpoint = config?.url?.startsWith('/v1/auth/');

      // Already replayed → do not refresh again (loop guard).
      const isRetry = config?._isRetry === true;

      // Only engage the refresh path when a token-based session exists.
      // Dev X-User-Id sessions (no stored tokens) skip this entirely.
      const storedRefreshToken = useAuthStore.getState().refreshToken;
      const hasTokenSession = Boolean(storedRefreshToken || useAuthStore.getState().accessToken);

      if (!isAuthEndpoint && !isRetry && hasTokenSession && config) {
        // Single-flight: if a refresh is already in progress, wait for it.
        if (!refreshPromise) {
          const { refreshToken: refreshTokenFn } = await import('./auth');
          const currentRefreshToken = useAuthStore.getState().refreshToken;

          if (!currentRefreshToken) {
            // No refresh token available — sign out.
            await signOutReset();
            return Promise.reject(error);
          }

          refreshPromise = refreshTokenFn(currentRefreshToken)
            .then(async (tokens) => {
              await useAuthStore.getState().setTokens(tokens);
            })
            .catch(async () => {
              await signOutReset();
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        try {
          await refreshPromise;
        } catch {
          // refreshPromise itself doesn't reject (errors are handled inside);
          // this catch is a safety net.
          return Promise.reject(error);
        }

        // Check if sign-out happened during the refresh (tokens cleared).
        if (!useAuthStore.getState().accessToken) {
          // Sign-out already performed and toasted inside the refresh chain.
          return Promise.reject(error);
        }

        // Replay the original request once. The request interceptor will
        // pick up the new access token from the store automatically.
        const retryConfig = { ...config, _isRetry: true };
        return apiClient.request(retryConfig);
      }

      // Fallthrough: auth endpoint, retry, or no token session → generic toast.
      handleHttpError(error);
      return Promise.reject(error);
    }

    // ── All other errors ──────────────────────────────────────────────────────
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
  // Opt-out: requests that handle their own absence (optional/flagged cards)
  // suppress the global toast for every error, including the 503 flag-off case.
  if (isErrorToastSilenced(error)) {
    return;
  }

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

export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
) {
  // `config` lets a caller carry per-request options (e.g. `silentErrorToast`
  // for optional cards) without changing the default request behavior.
  const res = await apiClient.get<T>(url, { params, ...config });
  return res.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
) {
  // `config` lets a slow endpoint (e.g. LLM-backed today/refresh) override the
  // default 15s timeout per-request without raising it globally.
  const res = await apiClient.post<T>(url, body, { params, ...config });
  return res.data;
}

export async function apiPatch<T>(url: string, body?: unknown) {
  const res = await apiClient.patch<T>(url, body);
  return res.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig) {
  const res = await apiClient.delete<T>(url, config);
  return res.data;
}
