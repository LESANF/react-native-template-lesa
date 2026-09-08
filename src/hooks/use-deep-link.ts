/**
 * 딥링크 배선 훅. **앱 전체에서 딱 한 번** mount 한다(providers/deep-link-runner).
 * `useQueryClient` 를 쓰므로 QueryProvider 안쪽에서만 동작한다. 배선 목록은 `docs/boot.md`.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { attributionAdapter } from '@/lib/deep-link/attribution';
import { deepLinkDispatcher } from '@/lib/deep-link/dispatcher';
import { captureLinkingColdStart, subscribeLinking } from '@/lib/deep-link/sources';
import { capturePushColdStart, subscribePush } from '@/lib/push/taps';

import { useNavigationReset } from './use-navigation-reset';

export function useDeepLink() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reset = useNavigationReset();

  useEffect(() => {
    deepLinkDispatcher.bindContext({ router, queryClient, reset });
  }, [router, queryClient, reset]);

  useEffect(() => {
    // capture 와 리스너가 같은 링크를 동시에 물어도 dispatcher 의 중복 제거가 걸러낸다.
    void captureLinkingColdStart();
    void capturePushColdStart();

    const unsubscribeLinking = subscribeLinking();
    const unsubscribePush = subscribePush();
    // 어트리뷰션 SDK 미사용이면 어댑터가 빈 객체라 no-op — 이 파일은 손대지 않는다.
    const unsubscribeAttribution = attributionAdapter.subscribeDeepLink?.(url =>
      deepLinkDispatcher.enqueueExternalSdkUrl(url)
    );
    return () => {
      unsubscribeLinking();
      unsubscribePush();
      unsubscribeAttribution?.();
    };
  }, []);
}
