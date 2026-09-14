/**
 * 알림 탭 전 구간: FCM payload → 추출 → 큐 → 화면 이동.
 * iOS 백그라운드 탭은 RNFB 와 notifee 양쪽에서 오므로 같은 알림이 두 번 들어온다 —
 * 한 번만 이동해야 한다(`docs/push.md` D6).
 */
import { jest } from '@jest/globals';

import { Env } from '@env';

const mockNavigate = jest.fn();

jest.mock('@/lib/deep-link/matcher', () => ({
  matchRoute: jest.fn((parsed: { path: string }) =>
    parsed.path.startsWith('menu-4/')
      ? { match: () => true, gates: [], navigate: mockNavigate, name: parsed.path }
      : null
  ),
}));

jest.mock('@/lib/deep-link/gates', () => ({
  GATE_MAP: {},
  runGates: jest.fn(async (_g: unknown, _m: unknown, _c: unknown, next: () => void) => next()),
}));

const flush = () => new Promise<void>(resolve => setImmediate(() => resolve()));

function load() {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { enqueuePushTap } = require('@/lib/push/core') as typeof import('@/lib/push/core');
  const { deepLinkDispatcher } =
    require('@/lib/deep-link/dispatcher') as typeof import('@/lib/deep-link/dispatcher');
  const { extractFromRemoteMessage, extractFromNotifeeDetail } =
    require('@/lib/deep-link/extractors') as typeof import('@/lib/deep-link/extractors');
  /* eslint-enable @typescript-eslint/no-require-imports */
  deepLinkDispatcher.bindContext({
    router: { navigate: jest.fn(), replace: jest.fn() },
  } as never);
  return { deepLinkDispatcher, enqueuePushTap, extractFromNotifeeDetail, extractFromRemoteMessage };
}

const deepLink = `${Env.identity.scheme}://menu-4/42`;
const fcmMessage = { data: { deep_link: deepLink }, messageId: 'm1' };
const notifeeDetail = { notification: { data: { deep_link: deepLink } } };

beforeEach(() => mockNavigate.mockClear());

describe('푸시 탭 체인', () => {
  it('백그라운드 탭이 화면까지 간다', async () => {
    const chain = load();
    chain.deepLinkDispatcher.notifySplashClosed();

    chain.enqueuePushTap(chain.extractFromRemoteMessage(fcmMessage), 'background');
    await flush();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('앱 종료 상태(cold)는 splash 가 끝날 때까지 기다린다', async () => {
    const chain = load();
    chain.enqueuePushTap(chain.extractFromRemoteMessage(fcmMessage), 'cold');
    await flush();
    expect(mockNavigate).not.toHaveBeenCalled();

    chain.deepLinkDispatcher.notifySplashClosed();
    await flush();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('RNFB 와 notifee 가 같은 알림을 주면 한 번만 이동한다 (D6)', async () => {
    const chain = load();
    chain.deepLinkDispatcher.notifySplashClosed();

    chain.enqueuePushTap(chain.extractFromRemoteMessage(fcmMessage), 'background');
    chain.enqueuePushTap(chain.extractFromNotifeeDetail(notifeeDetail), 'foreground-tap');
    await flush();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('cold 캡처가 RNFB·notifee 양쪽에서 와도 한 번만 이동한다', async () => {
    const chain = load();
    chain.enqueuePushTap(chain.extractFromRemoteMessage(fcmMessage), 'cold');
    chain.enqueuePushTap(chain.extractFromNotifeeDetail(notifeeDetail), 'cold');
    chain.deepLinkDispatcher.notifySplashClosed();
    await flush();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('딥링크 없는 알림은 이동하지 않는다 — 탭해도 그 자리에 있어야 한다', async () => {
    const chain = load();
    chain.deepLinkDispatcher.notifySplashClosed();

    chain.enqueuePushTap(chain.extractFromRemoteMessage({ data: { title: 'hi' } }), 'background');
    await flush();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(chain.deepLinkDispatcher.hasQueue()).toBe(false);
  });

  it('미등록 경로를 가리키는 알림은 큐를 막지 않는다', async () => {
    const chain = load();
    chain.deepLinkDispatcher.notifySplashClosed();

    chain.enqueuePushTap(`${Env.identity.scheme}://gone/1`, 'background');
    await flush();
    expect(chain.deepLinkDispatcher.hasQueue()).toBe(false);

    chain.enqueuePushTap(deepLink, 'background');
    await flush();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('서로 다른 알림 두 개는 둘 다 이동한다', async () => {
    const chain = load();
    chain.deepLinkDispatcher.notifySplashClosed();

    chain.enqueuePushTap(`${Env.identity.scheme}://menu-4/42`, 'background');
    chain.enqueuePushTap(`${Env.identity.scheme}://menu-4/43`, 'background');
    await flush();

    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });
});
