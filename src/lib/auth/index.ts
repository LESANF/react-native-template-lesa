import { ApiError, toApiError } from '@/lib/api/api-error';
import { useAuthStore } from '@/stores/auth-store';

import { isDefinitiveRefreshRejection, requestRefreshAccessToken } from './refresh-request';

let refreshInFlight: Promise<string> | null = null;

function expireAuthSession() {
  useAuthStore.getState().signOut();
}

async function rejectAuth(code: string, message: string): Promise<never> {
  expireAuthSession();
  throw new ApiError({
    code,
    message,
    isNetworkError: false,
  });
}

async function runRefreshAccessToken() {
  const sessionToken = useAuthStore.getState().token;
  const refreshToken = sessionToken?.refreshToken;
  if (!refreshToken) {
    return rejectAuth('AUTH_REFRESH_TOKEN_MISSING', 'Refresh token is missing.');
  }

  try {
    const tokens = await requestRefreshAccessToken(refreshToken);

    // refresh 사이 세션이 바뀌면 이전 응답을 폐기한다.
    if (useAuthStore.getState().token !== sessionToken) {
      throw new ApiError({
        code: 'AUTH_SESSION_CLOSED',
        message: 'Session was closed during refresh.',
        isNetworkError: false,
      });
    }

    useAuthStore.getState().signIn({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? refreshToken,
    });
    return tokens.accessToken;
  } catch (error) {
    const apiError = toApiError(error);
    if (useAuthStore.getState().token === sessionToken && isDefinitiveRefreshRejection(apiError)) {
      expireAuthSession();
    }
    throw apiError;
  }
}

// single-flight — 여러 요청이 401 을 맞아도 refresh 는 1회.
export function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = runRefreshAccessToken().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
