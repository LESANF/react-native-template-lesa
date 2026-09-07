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

    // refresh 사이 세션이 바뀌었다면 이전 응답을 폐기해 새 세션을 덮지 않는다.
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

// 동시에 여러 요청이 401을 맞아도 refresh 네트워크 호출은 1회만 나가도록
// 진행 중인 Promise를 공유한다(single-flight). 완료 후 해제되어 다음 만료 때 재사용된다.
export function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = runRefreshAccessToken().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
