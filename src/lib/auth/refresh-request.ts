import { ApiError } from '@/lib/api/api-error';
import type { AuthTokenPair } from '@/stores/auth-store';

export const isAuthRefreshConfigured = false;

export function isDefinitiveRefreshRejection(error: ApiError): boolean {
  return error.status === 400 || error.status === 401 || error.status === 403;
}

export function requestRefreshAccessToken(_refreshToken: string): Promise<AuthTokenPair> {
  // TODO(앱): raw axios/fetch 로 구현한다. 중앙 client 를 쓰면 401 이 데드락을 만든다.
  return Promise.reject(
    new ApiError({
      code: 'AUTH_REFRESH_UNIMPLEMENTED',
      message: 'Auth refresh endpoint is not configured.',
      isNetworkError: false,
    })
  );
}
