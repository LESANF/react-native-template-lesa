import type { PreloaderCallbacks, PreloaderResult, PreloaderStage, StageFailure } from './types';

import { STAGES } from '@/constants/preloader';

import { runForcedUpdateStage } from './forced-update';
import { hydrateAppState } from './hydrate';
import { runOtaStage } from './ota';

/**
 * 앱이 넣은 콜백(크래시 리포터·진행률 표시)이 throw 해도 부팅을 막지 않는다.
 * 이 콜백들은 **이미 뭔가 잘못됐을 때** 불리므로, 여기서 예외가 새면 splash 가 끝나지
 * 않고 앱이 아예 뜨지 않는다.
 */
function callSafely(label: string, call: () => void): void {
  try {
    call();
  } catch (error) {
    console.error(`[Preloader] ${label} callback threw:`, error);
  }
}

// 한 단계 실패해도 throw하지 않고 failures에 기록 → 다음 단계 계속.
async function runStage(
  stage: PreloaderStage,
  task: () => Promise<void>,
  callbacks: PreloaderCallbacks,
  failures: StageFailure[]
): Promise<void> {
  try {
    await task();
  } catch (error) {
    const failure: StageFailure = { stage, error };
    console.error(`[Preloader] ${stage} failed:`, error);
    // 콜백보다 먼저 기록한다 — 콜백이 throw 하면 실패 자체가 사라진다.
    failures.push(failure);
    callSafely('onStageError', () => callbacks.onStageError?.(failure));
  }
}

export async function runPreloader(callbacks: PreloaderCallbacks = {}): Promise<PreloaderResult> {
  const failures: StageFailure[] = [];
  let current = 0;

  const progress = (stage: PreloaderStage) => {
    current += 1;
    callSafely('onProgress', () => callbacks.onProgress?.(stage, current, STAGES.length));
    console.log(`[Preloader] ${stage} (${current}/${STAGES.length})`);
  };

  await runStage('hydrate', hydrateAppState, callbacks, failures);
  progress('hydrate');

  await runStage(
    'forced-update-check',
    () => runForcedUpdateStage(callbacks.onForcedUpdate),
    callbacks,
    failures
  );
  progress('forced-update-check');

  await runStage('ota-check', () => runOtaStage(callbacks.onOtaUpdate), callbacks, failures);
  progress('ota-check');

  if (callbacks.onPermissions) {
    await runStage(
      'permissions-check',
      async () => {
        await callbacks.onPermissions!();
      },
      callbacks,
      failures
    );
  }
  progress('permissions-check');

  return { failures };
}
