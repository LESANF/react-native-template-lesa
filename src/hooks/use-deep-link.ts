/**
 * Deep link 배선 훅. 앱 전체에서 딱 한 번 mount 한다 (providers/deep-link-runner).
 *   1) router/queryClient/reset 을 dispatcher 에 bind
 *   2) cold start 링크 capture (OS Linking + 푸시 알림 탭)
 *   3) background 복귀용 Linking 리스너 + 푸시 수신/탭 리스너 subscribe
 *
 * 푸시의 headless 쪽(앱이 죽은 채 도착한 메시지·백그라운드 탭)은 여기가 아니라
 * `lib/push/background.ts` 가 루트 index.js 에서 담당한다.
 *
 * useQueryClient 를 쓰므로 QueryProvider 안쪽에서만 동작한다.
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
    // 어트리뷰션 SDK 는 선택 — 붙이고 떼는 것은 `lib/deep-link/attribution.ts` 하나로 끝난다.
    // 미사용이면 어댑터가 빈 객체라 이 줄은 no-op 이다(이 파일은 손대지 않는다).
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
