import type { AxiosRequestConfig } from 'axios';

export const API_AUTH_EXPIRED_REASONS = {
  missingRefreshToken: 'missing_refresh_token',
  refreshFailed: 'refresh_failed',
  refreshUnavailable: 'refresh_unavailable',
} as const;

export type ApiAuthExpiredReason =
  (typeof API_AUTH_EXPIRED_REASONS)[keyof typeof API_AUTH_EXPIRED_REASONS];

export type ApiTokenPair = {
  readonly accessToken: string;
  readonly refreshToken?: string;
};

export type ApiTokenStore = {
  readonly getAccessToken: () => Promise<string | null> | string | null;
  readonly getRefreshToken: () => Promise<string | null> | string | null;
  readonly setTokens: (tokens: ApiTokenPair) => Promise<void> | void;
  readonly clearTokens: () => Promise<void> | void;
};

export type ApiRefreshAccessToken = (refreshToken: string) => Promise<ApiTokenPair>;

export type ApiAuthExpiredHandler = (reason: ApiAuthExpiredReason) => Promise<void> | void;

export type ApiAuthConfig = {
  readonly tokenStore: ApiTokenStore;
  readonly refreshAccessToken?: ApiRefreshAccessToken;
  readonly onAuthExpired?: ApiAuthExpiredHandler;
};

export type ApiClient = {
  readonly get: <TResponse>(url: string, config?: AxiosRequestConfig) => Promise<TResponse>;
  readonly post: <TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ) => Promise<TResponse>;
};

declare module 'axios' {
  export interface AxiosRequestConfig {
    apiAuth?: 'public' | 'private' | 'refresh';
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
}
