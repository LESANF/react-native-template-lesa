/**
 * 큐 · 중복 제거 · cold 홀드. 여기가 틀리면 화면이 두 번 열리거나 splash 에 갇힌다.
 * matcher 와 gates 를 목으로 세워 디스패처 자체 로직만 본다.
 */
import { jest } from '@jest/globals';

import { Env } from '@env';

// 자리표시든 치환됐든 현재 스킴으로 만든다 — 하드코딩하면 앱마다 깨진다.
const link = (path: string) => `${Env.identity.scheme}://${path}`;

const mockNavigate = jest.fn();

jest.mock('@/lib/deep-link/matcher', () => ({
  matchRoute: jest.fn((parsed: { path: string }) =>
    parsed.path === 'unknown-route'
      ? null
      : { match: () => true, gates: [], navigate: mockNavigate, name: parsed.path }
  ),
}));

jest.mock('@/lib/deep-link/gates', () => ({
  GATE_MAP: {},
  runGates: jest.fn(async (_gates: unknown, _map: unknown, _ctx: unknown, next: () => void) =>
    next()
  ),
}));

const flush = () => new Promise<void>(resolve => setImmediate(() => resolve()));

// 모듈 레벨 상태(큐·splash 플래그)를 쓰므로 테스트마다 새로 읽는다.
function load() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { deepLinkDispatcher } = require('@/lib/deep-link/dispatcher');
  deepLinkDispatcher.bindContext({ router: { replace: jest.fn(), navigate: jest.fn() } });
  return deepLinkDispatcher as typeof import('@/lib/deep-link/dispatcher').deepLinkDispatcher;
}

beforeEach(() => mockNavigate.mockClear());

describe('deepLinkDispatcher', () => {
  it('splash 가 닫히기 전에는 cold 를 붙잡고 있다', async () => {
    const d = load();
    d.enqueue(link('menu-4/42'), 'cold');
    await flush();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(d.hasQueue()).toBe(true);

    d.notifySplashClosed();
    await flush();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('splash 중에 들어온 background 탭도 cold 로 홀드한다', async () => {
    const d = load();
    d.enqueue(link('menu-4/42'), 'background');
    await flush();
    expect(mockNavigate).not.toHaveBeenCalled();

    d.notifySplashClosed();
    await flush();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('in-app 은 splash 와 무관하게 바로 간다', async () => {
    const d = load();
    d.enqueue(link('menu-4/42'), 'in-app');
    await flush();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('같은 링크가 TTL 안에 두 번 오면 한 번만 이동한다', async () => {
    const d = load();
    d.notifySplashClosed();
    d.enqueue(link('menu-4/42'), 'background');
    await flush();
    d.enqueue(link('menu-4/42'), 'foreground-tap');
    await flush();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('query 순서가 달라도 같은 링크로 본다', async () => {
    const d = load();
    d.notifySplashClosed();
    d.enqueue(link('menu-4/42?a=1&b=2'), 'background');
    await flush();
    d.enqueue(link('menu-4/42?b=2&a=1'), 'background');
    await flush();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('경로가 다르면 둘 다 간다', async () => {
    const d = load();
    d.notifySplashClosed();
    d.enqueue(link('menu-4/42'), 'background');
    d.enqueue(link('menu-4/43'), 'background');
    await flush();
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('미등록 경로는 이동 없이 큐에서 빠진다', async () => {
    const d = load();
    d.notifySplashClosed();
    d.enqueue(link('unknown-route'), 'background');
    await flush();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(d.hasQueue()).toBe(false);
  });

  it('남의 스킴과 경로 없는 URL 은 큐에 들어가지 않는다', async () => {
    const d = load();
    d.notifySplashClosed();
    d.enqueue('otherapp://menu-4/42', 'background');
    d.enqueue(link(''), 'background');
    d.enqueue(null, 'background');
    await flush();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(d.hasQueue()).toBe(false);
  });

  it('markSplashReopened 뒤에는 다시 cold 로 홀드한다', async () => {
    const d = load();
    d.notifySplashClosed();
    d.markSplashReopened();
    d.enqueue(link('menu-4/42'), 'background');
    await flush();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
