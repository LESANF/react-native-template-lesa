/**
 * 부팅 오케스트레이션. 여기서 멈추면 splash 가 안 끝나고 **앱이 아예 안 뜬다** —
 * 사용자가 볼 수 있는 최악의 증상이다. 한 단계가 실패해도 부팅은 계속돼야 한다.
 */
import { jest } from '@jest/globals';

const mockHydrate = jest.fn<() => Promise<void>>();
const mockForcedUpdate = jest.fn<(cb?: unknown) => Promise<void>>();
const mockOta = jest.fn<(cb?: unknown) => Promise<void>>();

jest.mock('@/lib/preloader/hydrate', () => ({ hydrateAppState: () => mockHydrate() }));
jest.mock('@/lib/preloader/forced-update', () => ({
  runForcedUpdateStage: (cb?: unknown) => mockForcedUpdate(cb),
}));
jest.mock('@/lib/preloader/ota', () => ({ runOtaStage: (cb?: unknown) => mockOta(cb) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { runPreloader } = require('@/lib/preloader/core') as typeof import('@/lib/preloader/core');

beforeEach(() => {
  for (const m of [mockHydrate, mockForcedUpdate, mockOta]) {
    m.mockReset();
    m.mockResolvedValue(undefined);
  }
});

describe('runPreloader', () => {
  it('네 단계를 순서대로 돌고 진행률이 끝까지 간다', async () => {
    const onProgress = jest.fn<(stage: string, current: number, total: number) => void>();
    const result = await runPreloader({ onPermissions: async () => ({}) as never, onProgress });

    expect(result.failures).toEqual([]);
    expect(onProgress.mock.calls.map(c => c[0])).toEqual([
      'hydrate',
      'forced-update-check',
      'ota-check',
      'permissions-check',
    ]);
    expect(onProgress.mock.calls.at(-1)?.slice(1)).toEqual([4, 4]);
  });

  it('한 단계가 throw 해도 부팅을 계속한다 — 실패는 기록만 한다', async () => {
    const boom = new Error('policy server down');
    mockForcedUpdate.mockRejectedValue(boom);
    const onStageError = jest.fn();

    const result = await runPreloader({ onStageError });

    expect(mockOta).toHaveBeenCalled();
    expect(result.failures).toEqual([{ error: boom, stage: 'forced-update-check' }]);
    expect(onStageError).toHaveBeenCalledTimes(1);
  });

  it('여러 단계가 실패해도 전부 기록하고 끝까지 간다', async () => {
    mockHydrate.mockRejectedValue(new Error('a'));
    mockForcedUpdate.mockRejectedValue(new Error('b'));
    mockOta.mockRejectedValue(new Error('c'));

    const result = await runPreloader({
      onPermissions: async () => Promise.reject(new Error('d')),
    });

    expect(result.failures.map(f => f.stage)).toEqual([
      'hydrate',
      'forced-update-check',
      'ota-check',
      'permissions-check',
    ]);
  });

  it('콜백을 하나도 주지 않아도 resolve 한다 — 주입 안 하면 스킵', async () => {
    await expect(runPreloader()).resolves.toEqual({ failures: [] });
  });

  it('권한 콜백이 없으면 그 단계를 부르지 않는다', async () => {
    const onProgress = jest.fn<(stage: string) => void>();
    await runPreloader({ onProgress });
    // 스킵해도 진행률은 끝까지 올라간다 — splash 가 4/4 에서 멈춰 보이지 않게
    expect(onProgress.mock.calls.map(c => c[0])).toContain('permissions-check');
  });

  it('onStageError 가 throw 해도 부팅을 막지 않는다', async () => {
    mockOta.mockRejectedValue(new Error('ota'));
    const result = await runPreloader({
      onStageError: () => {
        throw new Error('reporter exploded');
      },
    });
    expect(result.failures.map(f => f.stage)).toEqual(['ota-check']);
  });

  it('onProgress 가 throw 해도 부팅을 막지 않는다', async () => {
    await expect(
      runPreloader({
        onProgress: () => {
          throw new Error('progress reporter exploded');
        },
      })
    ).resolves.toBeDefined();
  });
});
