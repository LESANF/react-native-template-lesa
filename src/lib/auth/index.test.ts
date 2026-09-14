/**
 * single-flight refresh. 깨지면 401 하나에 refresh 가 여러 번 나가 서버가 세션을 끊는다.
 * 갱신 중 세션이 바뀌면 이전 응답을 버려야 한다 — 안 그러면 로그아웃이 되돌려진다.
 */
import { jest } from '@jest/globals';

type RefreshResult = { accessToken: string; refreshToken?: string };
const mockRequestRefresh = jest.fn<(refreshToken: string) => Promise<RefreshResult>>();

jest.mock('@/lib/auth/refresh-request', () => ({
  isAuthRefreshConfigured: true,
  isDefinitiveRefreshRejection: (error: { status?: number }) =>
    error.status === 400 || error.status === 401 || error.status === 403,
  requestRefreshAccessToken: (token: string) => mockRequestRefresh(token),
}));

function load() {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  const auth = require('@/lib/auth') as typeof import('@/lib/auth');
  const { useAuthStore } = require('@/stores/auth-store') as typeof import('@/stores/auth-store');
  // 같은 레지스트리의 ApiError 여야 한다 — toApiError 가 남의 Error 는 UNKNOWN_ERROR 로 바꾸고
  // status 를 잃어, 확정 거절 판정이 통째로 무력해진다.
  const { ApiError } = require('@/lib/api/api-error') as typeof import('@/lib/api/api-error');
  /* eslint-enable @typescript-eslint/no-require-imports */
  useAuthStore.getState().signIn({ accessToken: 'old-access', refreshToken: 'refresh-1' });
  const httpError = (status: number) =>
    new ApiError({ code: 'HTTP', message: 'rejected', isNetworkError: false, status });
  return { ...auth, httpError, useAuthStore };
}

beforeEach(() => mockRequestRefresh.mockReset());

describe('refreshAccessToken', () => {
  it('동시에 여러 번 불러도 refresh 요청은 한 번이다', async () => {
    const { refreshAccessToken } = load();
    mockRequestRefresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'refresh-2' });

    const results = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(mockRequestRefresh).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['new-access', 'new-access', 'new-access']);
  });

  it('끝난 뒤에는 다시 요청한다 — in-flight 를 계속 물고 있지 않는다', async () => {
    const { refreshAccessToken } = load();
    mockRequestRefresh.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

    await refreshAccessToken();
    await refreshAccessToken();
    expect(mockRequestRefresh).toHaveBeenCalledTimes(2);
  });

  it('새 토큰을 스토어에 넣는다', async () => {
    const { refreshAccessToken, useAuthStore } = load();
    mockRequestRefresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'refresh-2' });

    await refreshAccessToken();
    expect(useAuthStore.getState().token).toEqual({
      accessToken: 'new-access',
      refreshToken: 'refresh-2',
    });
  });

  it('응답에 refreshToken 이 없으면 쓰던 것을 지킨다', async () => {
    const { refreshAccessToken, useAuthStore } = load();
    mockRequestRefresh.mockResolvedValue({ accessToken: 'new-access' });

    await refreshAccessToken();
    expect(useAuthStore.getState().token?.refreshToken).toBe('refresh-1');
  });

  it('refreshToken 이 없으면 요청하지 않고 세션을 끝낸다', async () => {
    const { refreshAccessToken, useAuthStore } = load();
    useAuthStore.getState().signIn({ accessToken: 'only-access' });

    await expect(refreshAccessToken()).rejects.toMatchObject({
      code: 'AUTH_REFRESH_TOKEN_MISSING',
    });
    expect(mockRequestRefresh).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('갱신 중 로그아웃하면 그 응답을 버린다 — 로그아웃이 되돌려지면 안 된다', async () => {
    const { refreshAccessToken, useAuthStore } = load();
    let resolveRefresh: (value: { accessToken: string }) => void = () => undefined;
    mockRequestRefresh.mockReturnValue(
      new Promise<{ accessToken: string }>(resolve => {
        resolveRefresh = resolve;
      })
    );

    const pending = refreshAccessToken();
    useAuthStore.getState().signOut();
    resolveRefresh({ accessToken: 'late-access' });

    await expect(pending).rejects.toMatchObject({ code: 'AUTH_SESSION_CLOSED' });
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('401·403 은 확정 거절이라 세션을 끝낸다', async () => {
    for (const status of [400, 401, 403]) {
      const { refreshAccessToken, useAuthStore, httpError } = load();
      mockRequestRefresh.mockRejectedValue(httpError(status));

      await expect(refreshAccessToken()).rejects.toMatchObject({ code: 'HTTP' });
      expect(useAuthStore.getState().status).toBe('signedOut');
    }
  });

  it('500·네트워크 실패로는 로그아웃하지 않는다 — 일시적 장애다', async () => {
    const { refreshAccessToken, useAuthStore, httpError } = load();
    mockRequestRefresh.mockRejectedValue(httpError(500));

    await expect(refreshAccessToken()).rejects.toMatchObject({ code: 'HTTP' });
    expect(useAuthStore.getState().status).toBe('signedIn');
  });
});
