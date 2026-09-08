/** **앱당 1회** mount(providers/deep-link-runner). QueryProvider 안쪽 필수. */

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
    // 같은 링크를 동시에 물어도 dispatcher 가 걸러낸다.
    void captureLinkingColdStart();
    void capturePushColdStart();

    const unsubscribeLinking = subscribeLinking();
    const unsubscribePush = subscribePush();
    // 어트리뷰션 미사용이면 no-op. 이 파일은 손대지 않는다.
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
