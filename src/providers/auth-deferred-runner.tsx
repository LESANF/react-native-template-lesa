import { useSegments } from 'expo-router';
import { useEffect } from 'react';

import { AUTH_ROUTE_GROUP } from '@/constants/deep-link';
import { pendingDeepLinkIntent } from '@/lib/deep-link/pending-intent';
import { useAuthStore } from '@/stores/auth-store';

/**
 * 미인증 딥링크의 deferred 진입. RootLayout 에 1회 mount.
 * `requestIdleCallback` 으로 미루는 이유: 모달 닫힘 애니메이션과의 race(RN 0.88 에서 InteractionManager 제거).
 */
export function AuthDeferredRunner() {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn');
  const segments = useSegments();
  // 세그먼트 union 은 생성 타입이라 문자열로 비교한다.
  const isOnAuth = (segments[0] as string | undefined) === AUTH_ROUTE_GROUP;

  useEffect(() => {
    if (!isSignedIn || isOnAuth) return;

    const intent = pendingDeepLinkIntent.consume();
    if (!intent) return;

    const handle = requestIdleCallback(() => intent());
    return () => cancelIdleCallback(handle);
  }, [isSignedIn, isOnAuth]);

  return null;
}
