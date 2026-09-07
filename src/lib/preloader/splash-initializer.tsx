import type { PreloaderStage, StageFailure } from './types';

import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { STAGES } from '@/constants/preloader';
import { prefetchOnSplash } from '@/lib/api/prefetch';
import { showForcedUpdatePopup } from '@/utils/show-forced-update-popup';
import { showOtaUpdatePopup } from '@/utils/show-ota-update-popup';

import { runPreloader } from './core';
import { requestAllPermissions } from './permissions';

type SplashProgressState = {
  stage: PreloaderStage;
  current: number;
  total: number;
  isOtaPending: boolean;
  isInitialized: boolean;
  failures: StageFailure[];
};

export function useSplashInitializer(): SplashProgressState {
  const [progressState, setProgressState] = useState<SplashProgressState>({
    stage: STAGES[0],
    current: 0,
    total: STAGES.length,
    isOtaPending: false,
    isInitialized: false,
    failures: [],
  });

  useEffect(() => {
    let cancelled = false;

    prefetchOnSplash();

    const initialize = async () => {
      console.log('[Splash] Starting initialization...');

      try {
        const result = await runPreloader({
          onProgress: (stage, current, total) => {
            if (cancelled) return;
            setProgressState(prev => ({ ...prev, stage, current, total }));
          },
          onStageError: failure => {
            if (cancelled) return;
            setProgressState(prev => ({
              ...prev,
              failures: [...prev.failures, failure],
            }));
          },
          onPermissions: requestAllPermissions,

          onForcedUpdate: ({ storeUrl }) => showForcedUpdatePopup(storeUrl),

          onOtaUpdate: async ({ download }) => {
            if (cancelled) return 'later';

            const choice = await showOtaUpdatePopup();
            if (choice !== 'now') return 'later';

            // 다운로드 진행 UI(흰 배경 + 인디케이터)로 전환. 성공 시 reload로 앱 재시작.
            // 실패해도 isOtaPending=true 유지 → splash-screen이 바로 tabs로 이동.
            setProgressState(prev => ({ ...prev, isOtaPending: true }));
            const ok = await download();
            return ok ? 'now' : 'later';
          },
        });

        console.log('[Splash] Initialized:', result);
      } catch (error) {
        console.error('[Splash] Initialization threw (should not happen):', error);
      } finally {
        if (!cancelled) {
          setProgressState(prev => ({ ...prev, isInitialized: true }));
        }
        // 스플래시 숨김은 훅이 단독 소유. 실패해도 앱 진입 보장.
        await SplashScreen.hideAsync().catch(() => undefined);
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  return progressState;
}
