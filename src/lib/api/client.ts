import {
  AxiosHeaders,
  create as createAxios,
  isAxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { Env } from '@env';

import { toApiError } from './api-error';
import { configureAuthRefreshSession, refreshAccessTokenOnce } from './auth-refresh-session';
import { apiTokenStore, configureApiTokenStore } from './auth-token-store';
import {
  type ApiAuthConfig,
  type ApiClient,
  type ApiTokenStore,
} from './client.types';

const AUTH_RETRY_STATUSES = [401, 403] as const;

function createAxiosClient(apiAuth: NonNullable<AxiosRequestConfig['apiAuth']>) {
  const instance = createAxios({
    baseURL: Env.urls.api,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use((config) => {
    config.apiAuth = config.apiAuth ?? apiAuth;
    return config;
  });

  return instance;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function ensureHeaders(config: InternalAxiosRequestConfig) {
  config.headers = AxiosHeaders.from(config.headers);
  return config.headers;
}

function installFormDataInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    if (isFormData(config.data)) {
      ensureHeaders(config).delete('Content-Type');
    }
    return config;
  });
}

function installAuthHeaderInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use(async (config) => {
    const accessToken = await apiTokenStore.getAccessToken();
    if (accessToken) {
      ensureHeaders(config).set('Authorization', `Bearer ${accessToken}`);
    }
    return config;
  });
}

function shouldRetryWithRefresh(error: unknown) {
  if (!isAxiosError(error)) return false;
  const { config, response } = error;
  if (!config || !response) return false;
  if (config._retry || config.skipAuthRefresh) return false;
  if (config.apiAuth !== 'private') return false;
  return AUTH_RETRY_STATUSES.some((status) => status === response.status);
}

function installAuthRetryInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!shouldRetryWithRefresh(error) || !isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    originalRequest._retry = true;

    const accessToken = await refreshAccessTokenOnce();
    ensureHeaders(originalRequest).set('Authorization', `Bearer ${accessToken}`);

    return instance.request(originalRequest);
  });
}

function installApiErrorInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (response) => response.data,
    (error: unknown) => Promise.reject(toApiError(error)),
  );
}

function createApiClient(instance: AxiosInstance): ApiClient {
  return {
    get<TResponse>(url: string, config?: AxiosRequestConfig) {
      return instance.get<TResponse, TResponse>(url, config);
    },

    post<TResponse, TBody = unknown>(
      url: string,
      data?: TBody,
      config?: AxiosRequestConfig<TBody>,
    ) {
      return instance.post<TResponse, TResponse, TBody>(url, data, config);
    },
  };
}

const publicAxiosClient = createAxiosClient('public');
const privateAxiosClient = createAxiosClient('private');
const refreshAxiosClient = createAxiosClient('refresh');

installFormDataInterceptor(publicAxiosClient);
installFormDataInterceptor(privateAxiosClient);
installFormDataInterceptor(refreshAxiosClient);
installAuthHeaderInterceptor(privateAxiosClient);
installAuthRetryInterceptor(privateAxiosClient);
installApiErrorInterceptor(publicAxiosClient);
installApiErrorInterceptor(privateAxiosClient);
installApiErrorInterceptor(refreshAxiosClient);

export const publicClient = createApiClient(publicAxiosClient);
export const privateClient = createApiClient(privateAxiosClient);
export const refreshClient = createApiClient(refreshAxiosClient);

export const apiAxiosClients = {
  public: publicAxiosClient,
  private: privateAxiosClient,
  refresh: refreshAxiosClient,
} as const;

export function configureApiAuth({ tokenStore, refreshAccessToken, onAuthExpired }: ApiAuthConfig) {
  configureApiTokenStore(tokenStore);
  configureAuthRefreshSession({
    nextRefreshAccessToken: refreshAccessToken,
    nextOnAuthExpired: onAuthExpired,
  });
}

export function configureApiTokenAccess(tokenStore: ApiTokenStore) {
  configureApiTokenStore(tokenStore);
}
