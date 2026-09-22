/**
 * 딥링크 진입 게이트. 미통과 시 dispatcher 는 멈춘다 — 그래서 게이트가 있는 라우트는
 * `safeFallbackExpoPath` 를 두어야 splash 에 갇히지 않는다. 상세는 `docs/boot.md`.
 */

import { authGate } from './auth';

import type { GateName, NavigateContext } from '@/lib/deep-link/types';

export type GateContext = NavigateContext;

export interface Gate {
  name: GateName;
  check: (ctx: GateContext) => Promise<boolean>;
  request: (ctx: GateContext, onResolve: () => void) => void;
}

// TODO(앱): 게이트를 추가하면 `types.ts` 의 GateName union 도 함께 넓힌다.
export const GATE_MAP: Record<GateName, Gate> = {
  auth: authGate,
};

/** 순차 실행. 미통과 시 그 gate.request 를 부르고 정지한다. */
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
