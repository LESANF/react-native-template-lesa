import { ApiError } from './api-error';
import { apiTokenStore } from './auth-token-store';
import {
  API_AUTH_EXPIRED_REASONS,
  type ApiAuthExpiredHandler,
  type ApiRefreshAccessToken,
} from './client.types';

let refreshAccessToken: ApiRefreshAccessToken | undefined;
let onAuthExpired: ApiAuthExpiredHandler | undefined;
let refreshInFlight: Promise<string> | null = null;

export function configureAuthRefreshSession({
  nextRefreshAccessToken,
  nextOnAuthExpired,
}: {
  readonly nextRefreshAccessToken?: ApiRefreshAccessToken;
  readonly nextOnAuthExpired?: ApiAuthExpiredHandler;
}) {
  refreshAccessToken = nextRefreshAccessToken;
  onAuthExpired = nextOnAuthExpired;
}

async function notifyAuthExpired(reason: Parameters<ApiAuthExpiredHandler>[0]) {
  await apiTokenStore.clearTokens();
  await onAuthExpired?.(reason);
}

async function runRefreshAccessToken() {
  if (!refreshAccessToken) {
    await notifyAuthExpired(API_AUTH_EXPIRED_REASONS.refreshUnavailable);
    throw new ApiError({
      code: 'AUTH_REFRESH_UNAVAILABLE',
      message: 'Auth refresh handler is not configured.',
      isNetworkError: false,
      raw: null,
    });
  }

  const refreshToken = await apiTokenStore.getRefreshToken();
  if (!refreshToken) {
    await notifyAuthExpired(API_AUTH_EXPIRED_REASONS.missingRefreshToken);
    throw new ApiError({
      code: 'AUTH_REFRESH_TOKEN_MISSING',
      message: 'Refresh token is missing.',
      isNetworkError: false,
      raw: null,
    });
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    await apiTokenStore.setTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    await notifyAuthExpired(API_AUTH_EXPIRED_REASONS.refreshFailed);
    throw error;
  }
}

export function refreshAccessTokenOnce() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = runRefreshAccessToken().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
