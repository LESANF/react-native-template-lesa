import {
  AxiosHeaders,
  create as createAxios,
  type AxiosError,
  isAxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { Env } from '@env';
import { refreshAccessToken } from '@/lib/auth';
import { isAuthRefreshConfigured } from '@/lib/auth/refresh-request';
import { useAuthStore } from '@/stores/auth-store';

import { ApiError, toApiError } from './api-error';

export type ApiAuthMode = 'none' | 'required';

type ResponseParser<TResponse> = (data: unknown) => TResponse;

export type ApiRequestConfig<TBody = unknown, TResponse = unknown> =
  Omit<AxiosRequestConfig<TBody>, 'auth'> & {
    readonly auth?: ApiAuthMode;
    readonly parse?: ResponseParser<TResponse>;
  };

export type RawApiRequestConfig<TBody = unknown> = Omit<AxiosRequestConfig<TBody>, 'auth'> & {
  readonly auth?: ApiAuthMode;
};

type ApiClient = {
  get<TResponse>(url: string, config?: ApiRequestConfig<unknown, TResponse>): Promise<TResponse>;
  post<TResponse, TBody = unknown>(url: string, data?: TBody, config?: ApiRequestConfig<TBody, TResponse>): Promise<TResponse>;
  put<TResponse, TBody = unknown>(url: string, data?: TBody, config?: ApiRequestConfig<TBody, TResponse>): Promise<TResponse>;
  patch<TResponse, TBody = unknown>(url: string, data?: TBody, config?: ApiRequestConfig<TBody, TResponse>): Promise<TResponse>;
  delete<TResponse>(url: string, config?: ApiRequestConfig<unknown, TResponse>): Promise<TResponse>;
  requestRaw<TResponse, TBody = unknown>(config: RawApiRequestConfig<TBody>): Promise<AxiosResponse<TResponse>>;
};

type RefreshableAxiosError = AxiosError & {
  readonly config: InternalAxiosRequestConfig;
  readonly response: NonNullable<AxiosError['response']>;
};

const AUTH_ATTACHED_CONFIG_KEY = '_authAttached';
const AUTH_MODE_CONFIG_KEY = '_authMode';
const AUTH_RETRIED_CONFIG_KEY = '_authRetried';

function isAuthAttached(config: InternalAxiosRequestConfig): boolean {
  return Reflect.get(config, AUTH_ATTACHED_CONFIG_KEY) === true;
}

function isAuthRetried(config: InternalAxiosRequestConfig): boolean {
  return Reflect.get(config, AUTH_RETRIED_CONFIG_KEY) === true;
}

function isAuthRequired(config: InternalAxiosRequestConfig): boolean {
  return Reflect.get(config, AUTH_MODE_CONFIG_KEY) === 'required';
}

function markAuthAttached(config: InternalAxiosRequestConfig) {
  Reflect.set(config, AUTH_ATTACHED_CONFIG_KEY, true);
}

function markAuthMode(config: object, auth: ApiAuthMode) {
  Reflect.set(config, AUTH_MODE_CONFIG_KEY, auth);
}

function markAuthRetried(config: InternalAxiosRequestConfig) {
  Reflect.set(config, AUTH_RETRIED_CONFIG_KEY, true);
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function ensureHeaders(config: InternalAxiosRequestConfig) {
  config.headers = AxiosHeaders.from(config.headers);
  return config.headers;
}

// TODO(앱): 만료 신호가 401이 아닌 서버는 아래 조건을 바꾼다 (예: 403이면 `=== 403`, JP가 그 경우).
function isRefreshableError(error: unknown): error is RefreshableAxiosError {
  if (!isAuthRefreshConfigured) return false;
  if (!isAxiosError(error)) return false;
  const { config, response } = error;
  if (!config || !response) return false;
  if (!isAuthRequired(config) || !isAuthAttached(config) || isAuthRetried(config)) {
    return false;
  }
  return response.status === 401;
}

function splitConfig<TBody, TResponse>(
  config?: ApiRequestConfig<TBody, TResponse>,
) {
  if (!config) return { requestConfig: undefined, parse: undefined };
  const { auth = 'none', parse, ...requestConfig } = config;
  markAuthMode(requestConfig, auth);
  return { requestConfig, parse };
}

function prepareRawConfig<TBody>(
  config: RawApiRequestConfig<TBody>,
): AxiosRequestConfig<TBody> {
  const { auth = 'none', ...requestConfig } = config;
  markAuthMode(requestConfig, auth);
  return requestConfig;
}

async function unwrapResponse<TResponse>(
  request: Promise<AxiosResponse<TResponse>>,
  parse?: ResponseParser<TResponse>,
): Promise<TResponse> {
  const response = await request;
  if (!parse) return response.data;

  try {
    return parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

function createApiClient(instance: AxiosInstance): ApiClient {
  return {
    get<TResponse>(url: string, config?: ApiRequestConfig<unknown, TResponse>) {
      const { requestConfig, parse } = splitConfig(config);
      return unwrapResponse(
        instance.get<TResponse, AxiosResponse<TResponse>>(url, requestConfig),
        parse,
      );
    },

    post<TResponse, TBody = unknown>(
      url: string,
      data?: TBody,
      config?: ApiRequestConfig<TBody, TResponse>,
    ) {
      const { requestConfig, parse } = splitConfig(config);
      const request = instance.post<TResponse, AxiosResponse<TResponse>, TBody>(
        url,
        data,
        requestConfig,
      );
      return unwrapResponse(request, parse);
    },

    put<TResponse, TBody = unknown>(
      url: string,
      data?: TBody,
      config?: ApiRequestConfig<TBody, TResponse>,
    ) {
      const { requestConfig, parse } = splitConfig(config);
      const request = instance.put<TResponse, AxiosResponse<TResponse>, TBody>(
        url,
        data,
        requestConfig,
      );
      return unwrapResponse(request, parse);
    },

    patch<TResponse, TBody = unknown>(
      url: string,
      data?: TBody,
      config?: ApiRequestConfig<TBody, TResponse>,
    ) {
      const { requestConfig, parse } = splitConfig(config);
      const request = instance.patch<TResponse, AxiosResponse<TResponse>, TBody>(
        url,
        data,
        requestConfig,
      );
      return unwrapResponse(request, parse);
    },

    delete<TResponse>(url: string, config?: ApiRequestConfig<unknown, TResponse>) {
      const { requestConfig, parse } = splitConfig(config);
      return unwrapResponse(
        instance.delete<TResponse, AxiosResponse<TResponse>>(url, requestConfig),
        parse,
      );
    },

    requestRaw<TResponse, TBody = unknown>(config: RawApiRequestConfig<TBody>) {
      return instance.request<TResponse, AxiosResponse<TResponse>, TBody>(
        prepareRawConfig(config),
      );
    },
  };
}

const axiosClient = createAxios({
  baseURL: Env.urls.api,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const headers = ensureHeaders(config);

  if (isFormData(config.data)) {
    headers.delete('Content-Type');
  }

  if (!isAuthRequired(config)) return config;

  const accessToken = useAuthStore.getState().token?.accessToken;
  if (!accessToken) {
    throw new ApiError({
      code: 'AUTH_REQUIRED',
      message: 'This request requires an authenticated session.',
      isNetworkError: false,
    });
  }

  headers.set('Authorization', `Bearer ${accessToken}`);
  markAuthAttached(config);
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isRefreshableError(error)) {
      return Promise.reject(toApiError(error));
    }

    const originalRequest = error.config;
    markAuthRetried(originalRequest);

    try {
      const accessToken = await refreshAccessToken();
      ensureHeaders(originalRequest).set('Authorization', `Bearer ${accessToken}`);
      return await axiosClient.request(originalRequest);
    } catch (refreshError) {
      return Promise.reject(toApiError(refreshError));
    }
  },
);

export const client = createApiClient(axiosClient);
