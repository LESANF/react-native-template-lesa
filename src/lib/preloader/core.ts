import type { PreloaderCallbacks, PreloaderResult, PreloaderStage, StageFailure } from './types';

import { STAGES } from '@/constants/preloader';

import { runForcedUpdateStage } from './forced-update';
import { hydrateAppState } from './hydrate';
import { runOtaStage } from './ota';

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
    callbacks.onStageError?.(failure);
    failures.push(failure);
  }
}

export async function runPreloader(callbacks: PreloaderCallbacks = {}): Promise<PreloaderResult> {
  const failures: StageFailure[] = [];
  let current = 0;

  const progress = (stage: PreloaderStage) => {
    callbacks.onProgress?.(stage, ++current, STAGES.length);
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
