/**
 * 인터셉터 계약 — 실무에서 조용히 틀리면 제일 아픈 곳이다.
 * 공개 요청에 토큰이 새거나, 401 에 refresh 가 안 붙거나, 재시도가 무한이 되는 경우.
 *
 * axios adapter 를 주입해서 실제 인터셉터를 통과시킨다(모듈 목이 아니다).
 */
import { jest } from '@jest/globals';

import type { AxiosRequestConfig, AxiosResponse } from 'axios';

type Adapter = (config: AxiosRequestConfig) => Promise<AxiosResponse>;
const mockAdapter = jest.fn<Adapter>();

jest.mock('axios', () => {
  const actual = jest.requireActual('axios') as typeof import('axios');
  return {
    ...actual,
    create: (config: AxiosRequestConfig) =>
      actual.create({ ...config, adapter: (c: AxiosRequestConfig) => mockAdapter(c) }),
  };
});

const mockRefresh = jest.fn<() => Promise<string>>();
jest.mock('@/lib/auth', () => ({ refreshAccessToken: () => mockRefresh() }));

// 템플릿 기본값은 **false** 다(refresh 엔드포인트가 TODO(앱)). 둘 다 검사한다.
let mockRefreshConfigured = true;
jest.mock('@/lib/auth/refresh-request', () => ({
  get isAuthRefreshConfigured() {
    return mockRefreshConfigured;
  },
}));

const ok = (config: AxiosRequestConfig, data: unknown = { ok: true }): AxiosResponse =>
  ({ config, data, headers: {}, status: 200, statusText: 'OK' }) as AxiosResponse;

function load() {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { client } = require('@/lib/api/client') as typeof import('@/lib/api/client');
  const { useAuthStore } = require('@/stores/auth-store') as typeof import('@/stores/auth-store');
  const { ApiError } = require('@/lib/api/api-error') as typeof import('@/lib/api/api-error');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { ApiError, client, useAuthStore };
}

// 재시도는 **같은 config 객체를 변형**한다 — mock.calls 를 나중에 읽으면 둘 다 최신 값이다.
const sentAuth: (string | undefined)[] = [];
const captureAuth = (config: AxiosRequestConfig) => {
  sentAuth.push(config.headers?.Authorization as string | undefined);
};

const unauthorized = (config: AxiosRequestConfig, ApiErrorCtor: unknown) => {
  // axios 는 adapter 가 reject 한 AxiosError 를 그대로 응답 에러로 쓴다.
  const { AxiosError } = jest.requireActual('axios') as typeof import('axios');
  void ApiErrorCtor;
  return Promise.reject(
    new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config as never, {}, {
      config,
      data: {},
      headers: {},
      status: 401,
      statusText: 'Unauthorized',
    } as AxiosResponse)
  );
};

beforeEach(() => {
  mockAdapter.mockReset();
  mockRefresh.mockReset();
  sentAuth.length = 0;
  mockRefreshConfigured = true;
});

describe('api client', () => {
  it('기본은 auth 없음 — 공개 요청에 Authorization 이 새지 않는다', async () => {
    const { client, useAuthStore } = load();
    useAuthStore.getState().signIn({ accessToken: 'secret', refreshToken: 'r' });
    mockAdapter.mockImplementation(c => Promise.resolve(ok(c)));

    mockAdapter.mockImplementation(c => {
      captureAuth(c);
      return Promise.resolve(ok(c));
    });

    await client.get('/public');
    expect(sentAuth).toEqual([undefined]);
  });

  it("auth: 'required' 는 Bearer 를 붙인다", async () => {
    const { client, useAuthStore } = load();
    useAuthStore.getState().signIn({ accessToken: 'token-1', refreshToken: 'r' });
    mockAdapter.mockImplementation(c => Promise.resolve(ok(c)));

    mockAdapter.mockImplementation(c => {
      captureAuth(c);
      return Promise.resolve(ok(c));
    });

    await client.get('/me', { auth: 'required' });
    expect(sentAuth).toEqual(['Bearer token-1']);
  });

  it('로그아웃 상태의 required 요청은 보내지 않고 throw 한다', async () => {
    const { client, useAuthStore } = load();
    useAuthStore.getState().signOut();

    await expect(client.get('/me', { auth: 'required' })).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockAdapter).not.toHaveBeenCalled();
  });

  it('401 이면 refresh 하고 새 토큰으로 한 번 재시도한다', async () => {
    const { ApiError, client, useAuthStore } = load();
    useAuthStore.getState().signIn({ accessToken: 'stale', refreshToken: 'r' });
    mockRefresh.mockImplementation(async () => {
      useAuthStore.getState().signIn({ accessToken: 'fresh', refreshToken: 'r' });
      return 'fresh';
    });
    mockAdapter
      .mockImplementationOnce(c => {
        captureAuth(c);
        return unauthorized(c, ApiError);
      })
      .mockImplementationOnce(c => {
        captureAuth(c);
        return Promise.resolve(ok(c, { me: 1 }));
      });

    await expect(client.get('/me', { auth: 'required' })).resolves.toEqual({ me: 1 });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(sentAuth).toEqual(['Bearer stale', 'Bearer fresh']);
  });

  it('재시도가 또 401 이면 멈춘다 — 무한 루프가 되지 않는다', async () => {
    const { ApiError, client, useAuthStore } = load();
    useAuthStore.getState().signIn({ accessToken: 'stale', refreshToken: 'r' });
    mockRefresh.mockResolvedValue('fresh');
    mockAdapter.mockImplementation(c => unauthorized(c, ApiError));

    await expect(client.get('/me', { auth: 'required' })).rejects.toBeDefined();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockAdapter).toHaveBeenCalledTimes(2);
  });

  it('공개 요청의 401 로는 refresh 하지 않는다 — 남의 401 로 세션을 건드리면 안 된다', async () => {
    const { ApiError, client, useAuthStore } = load();
    useAuthStore.getState().signIn({ accessToken: 'token', refreshToken: 'r' });
    mockAdapter.mockImplementation(c => unauthorized(c, ApiError));

    await expect(client.get('/public')).rejects.toBeDefined();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockAdapter).toHaveBeenCalledTimes(1);
  });

  it('parse 가 throw 하면 ApiError 로 감싼다', async () => {
    const { client } = load();
    mockAdapter.mockImplementation(c => Promise.resolve(ok(c, { wrong: true })));

    await expect(
      client.get('/thing', {
        parse: () => {
          throw new Error('shape mismatch');
        },
      })
    ).rejects.toMatchObject({ isNetworkError: false });
  });

  // 기본 헤더가 application/json 인 채로 FormData 를 주면 axios 가 JSON 으로 직렬화한다.
  // 인터셉터가 지우는 목적이 그것이고, 그 뒤 axios 가 무엇으로 채우는지는 플랫폼 몫이다.
  it('FormData 를 application/json 으로 보내지 않는다', async () => {
    const { client } = load();
    mockAdapter.mockImplementation(c => Promise.resolve(ok(c)));

    await client.post('/upload', new FormData());
    expect(mockAdapter.mock.calls[0]?.[0].headers?.['Content-Type']).not.toBe('application/json');
  });

  // refresh 를 붙이기 전 실무 첫날에 마주치는 경로다.
  it('refresh 미구성(템플릿 기본)이면 401 을 그대로 올린다 — 재시도도 세션 변경도 없다', async () => {
    mockRefreshConfigured = false;
    const { ApiError, client, useAuthStore } = load();
    useAuthStore.getState().signIn({ accessToken: 'token', refreshToken: 'r' });
    mockAdapter.mockImplementation(c => unauthorized(c, ApiError));

    await expect(client.get('/me', { auth: 'required' })).rejects.toBeDefined();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockAdapter).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe('signedIn');
  });
});
