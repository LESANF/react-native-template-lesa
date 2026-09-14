/**
 * 버전 비교가 틀리면 전 사용자가 스토어로 막히거나(치명), 반대로 아무도 막히지 않는다.
 * 'update' 를 고르면 **의도적으로 resolve 하지 않는다** — 홈 진입을 막는 방식이다.
 */
import { jest } from '@jest/globals';

import type { AppForceUpdateResponse } from '@/api/app/types';

const mockGet = jest.fn<() => Promise<AppForceUpdateResponse | null>>();
jest.mock('@/api/app/requests', () => ({ getAppForceUpdate: () => mockGet() }));

let mockOS = 'ios';
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

const mockVersion = { app: '1.0.0' };
jest.mock('@env', () => ({
  Env: {
    get version() {
      return mockVersion;
    },
  },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { runForcedUpdateStage } =
  require('@/lib/preloader/forced-update') as typeof import('@/lib/preloader/forced-update');
/* eslint-enable @typescript-eslint/no-require-imports */

const policy = (payload: unknown): AppForceUpdateResponse =>
  ({ payload }) as AppForceUpdateResponse;
const stores = { android: 'market://x', ios: 'https://apps.apple.com/x' };

beforeEach(() => {
  mockGet.mockReset();
  mockOS = 'ios';
  mockVersion.app = '1.0.0';
});

describe('runForcedUpdateStage', () => {
  it('현재 버전이 minVersion 보다 낮으면 팝업을 띄운다', async () => {
    mockGet.mockResolvedValue(policy({ minVersion: '1.1.0', storeUrl: stores }));
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);

    await runForcedUpdateStage(onForcedUpdate);
    expect(onForcedUpdate).toHaveBeenCalledWith({ storeUrl: stores.ios });
  });

  it('같거나 높으면 막지 않는다', async () => {
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);
    for (const minVersion of ['1.0.0', '0.9.9']) {
      mockGet.mockResolvedValue(policy({ minVersion, storeUrl: stores }));
      await runForcedUpdateStage(onForcedUpdate);
    }
    expect(onForcedUpdate).not.toHaveBeenCalled();
  });

  it('플랫폼별 minVersion 과 스토어 주소를 고른다', async () => {
    mockGet.mockResolvedValue(
      policy({ minVersion: { android: '2.0.0', ios: '0.9.0' }, storeUrl: stores })
    );
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);

    await runForcedUpdateStage(onForcedUpdate);
    expect(onForcedUpdate).not.toHaveBeenCalled(); // ios 는 0.9.0 → 최신

    mockOS = 'android';
    await runForcedUpdateStage(onForcedUpdate);
    expect(onForcedUpdate).toHaveBeenCalledWith({ storeUrl: stores.android });
  });

  it('정책 요청이 실패하면 조용히 통과한다 — 서버가 죽어도 앱은 뜬다', async () => {
    mockGet.mockRejectedValue(new Error('network down'));
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);

    await expect(runForcedUpdateStage(onForcedUpdate)).resolves.toBeUndefined();
    expect(onForcedUpdate).not.toHaveBeenCalled();
  });

  it('정책이 비면 통과한다 (템플릿 기본)', async () => {
    mockGet.mockResolvedValue(policy(null));
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);

    await runForcedUpdateStage(onForcedUpdate);
    expect(onForcedUpdate).not.toHaveBeenCalled();
  });

  it('semver 가 아니면 막지 않는다 — 오타 하나로 전 사용자를 막으면 안 된다', async () => {
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);
    for (const minVersion of ['최신', '1.0', '1.1.0.0', '']) {
      mockGet.mockResolvedValue(policy({ minVersion, storeUrl: stores }));
      await runForcedUpdateStage(onForcedUpdate);
    }
    expect(onForcedUpdate).not.toHaveBeenCalled();
  });

  it('`v` 접두사와 공백은 semver 가 관대하게 받는다 — 정책 값 오타에 관용', async () => {
    mockGet.mockResolvedValue(policy({ minVersion: 'v1.1.0 ', storeUrl: stores }));
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);

    await runForcedUpdateStage(onForcedUpdate);
    expect(onForcedUpdate).toHaveBeenCalled();
  });

  it('스토어 주소가 없으면 막지 않는다 — 나갈 길 없는 팝업에 갇히면 안 된다', async () => {
    mockGet.mockResolvedValue(policy({ minVersion: '1.1.0', storeUrl: { android: '', ios: '' } }));
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);

    await runForcedUpdateStage(onForcedUpdate);
    expect(onForcedUpdate).not.toHaveBeenCalled();
  });

  it('콜백이 없으면 막지 않는다 — 주입 = 활성화', async () => {
    mockGet.mockResolvedValue(policy({ minVersion: '1.1.0', storeUrl: stores }));
    await expect(runForcedUpdateStage(undefined)).resolves.toBeUndefined();
  });

  it("'update' 를 고르면 의도적으로 resolve 하지 않는다 — 홈 진입을 막는 방식이다", async () => {
    mockGet.mockResolvedValue(policy({ minVersion: '1.1.0', storeUrl: stores }));
    let settled = false;
    void runForcedUpdateStage(async () => 'update').then(() => {
      settled = true;
    });

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    expect(settled).toBe(false);
  });

  it("'dismiss' 를 고르면 통과한다 — 안전 탈출 경로", async () => {
    mockGet.mockResolvedValue(policy({ minVersion: '1.1.0', storeUrl: stores }));
    await expect(runForcedUpdateStage(async () => 'dismiss')).resolves.toBeUndefined();
  });

  it('프리릴리즈 버전도 semver 로 비교한다', async () => {
    mockVersion.app = '1.0.0-beta.1';
    mockGet.mockResolvedValue(policy({ minVersion: '1.0.0', storeUrl: stores }));
    const onForcedUpdate = jest.fn(async () => 'dismiss' as const);

    await runForcedUpdateStage(onForcedUpdate);
    expect(onForcedUpdate).toHaveBeenCalled(); // 1.0.0-beta.1 < 1.0.0
  });
});
