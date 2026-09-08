import type { PreloaderCallbacks } from './types';

import { HotUpdater } from '@hot-updater/react-native';
import { Env } from '@env';

// 다운로드가 너무 빨리 끝나서 인디케이터가 깜빡 지나가는 걸 방지
const MIN_INDICATOR_VISIBLE_MS = 1500;

/** OTA 체크. 콜백 미주입 시 skip. 흐름은 `docs/boot.md`. */
export async function runOtaStage(onOtaUpdate?: PreloaderCallbacks['onOtaUpdate']): Promise<void> {
  if (!onOtaUpdate) {
    console.log('[Preloader/ota] skipped (no callback)');
    return;
  }
  if (__DEV__) {
    console.log('[Preloader/ota] skipped (__DEV__)');
    return;
  }
  if (!Env.urls.ota) {
    console.log('[Preloader/ota] skipped (no baseURL)');
    return;
  }

  let updateInfo: Awaited<ReturnType<typeof HotUpdater.checkForUpdate>>;
  try {
    updateInfo = await HotUpdater.checkForUpdate({ updateStrategy: 'fingerprint' });
  } catch (error) {
    // 네트워크 끊김·서버 다운 — 조용히 skip.
    console.warn('[Preloader/ota] checkForUpdate failed:', error);
    return;
  }

  if (!updateInfo) {
    console.log('[Preloader/ota] up to date');
    return;
  }

  await onOtaUpdate({
    message: updateInfo.message,
    download: async () => {
      const startedAt = Date.now();
      try {
        const ok = await updateInfo.updateBundle();
        if (!ok) return false;

        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_INDICATOR_VISIBLE_MS) {
          await new Promise(resolve => setTimeout(resolve, MIN_INDICATOR_VISIBLE_MS - elapsed));
        }
        // 콜백 컨텍스트를 먼저 resolve 하고 다음 tick 에 reload — 즉시 reload 하면
        // RN bridge teardown 이 콜백 resolve 와 경합해 iOS 에서 앱이 종료된다.
        setTimeout(() => {
          HotUpdater.reload().catch(() => undefined);
        }, 0);
        return true;
      } catch (error) {
        console.error('[Preloader/ota] updateBundle failed:', error);
        return false;
      }
    },
  });
}
