import { ApiError } from '@/lib/api/api-error';
import type { AuthTokenPair } from '@/stores/auth-store';

export const isAuthRefreshConfigured = false;

export function isDefinitiveRefreshRejection(error: ApiError): boolean {
  return error.status === 400 || error.status === 401 || error.status === 403;
}

export function requestRefreshAccessToken(_refreshToken: string): Promise<AuthTokenPair> {
  // TODO(앱): 프로젝트 refresh endpoint를 raw axios/fetch로 구현한다. 중앙 client를
  // 재사용하면 refresh 요청의 401이 다시 refresh를 기다리는 데드락이 생긴다.
  return Promise.reject(
    new ApiError({
      code: 'AUTH_REFRESH_UNIMPLEMENTED',
      message: 'Auth refresh endpoint is not configured.',
      isNetworkError: false,
    })
  );
}
