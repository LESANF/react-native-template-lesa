/**
 * Deep link 진입 gate — KR `lib/deep-link/gates/index.ts` 이식.
 *   check    통과 여부만 반환 (UI X)
 *   request  미통과 시 UI. 통과 시 onResolve (deferred 게이트는 runner 가 호출)
 *
 * 게이트 미통과 시 dispatcher 는 navigate 하지 않고 멈춘다(request 가 onResolve 를 불러 재개).
 * 그래서 게이트가 있는 라우트는 `safeFallbackExpoPath` 를 두어 splash 가 먼저 그 화면으로 빠져나온다.
 */

import { authGate } from './auth';

import type { GateName, NavigateContext } from '../types';

export type GateContext = NavigateContext;

export interface Gate {
  name: GateName;
  check: (ctx: GateContext) => Promise<boolean>;
  request: (ctx: GateContext, onResolve: () => void) => void;
}

// TODO(앱): 게이트를 추가하면 여기와 `types.ts` 의 GateName union 을 함께 넓힌다.
//           KR 은 auth(로그인, deferred: 모달 닫힌 뒤 pending intent 재생) · verified(본인인증) ·
//           marketing(수신동의) · pushPermission(푸시 권한) 네 개를 응모 진입에 썼다.
export const GATE_MAP: Record<GateName, Gate> = {
  auth: authGate,
};

/** gate 순차 실행. 전체 통과 시 onAllPassed. 미통과 시 해당 gate.request 호출 후 정지. */
export async function runGates(
  gates: readonly GateName[],
  gateMap: Record<GateName, Gate>,
  navigationContext: NavigateContext,
  onAllPassed: () => void
): Promise<boolean> {
  const gateContext: GateContext = navigationContext;

  for (const gateName of gates) {
    const gate = gateMap[gateName];
    if (!gate) {
      console.error(`[deep-link/gates] Unknown gate: ${gateName}`);
      return false;
    }

    const passed = await gate.check(gateContext);
    if (passed) continue;

    gate.request(gateContext, onAllPassed);
    return false;
  }

  onAllPassed();
  return true;
}
