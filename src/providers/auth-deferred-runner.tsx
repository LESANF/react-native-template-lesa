import { useSegments } from 'expo-router';
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';

import { AUTH_ROUTE_GROUP } from '@/constants/deep-link';
import { pendingDeepLinkIntent } from '@/lib/deep-link/pending-intent';
import { useAuthStore } from '@/stores/auth-store';

/**
 * 미인증 딥링크의 deferred 진입 (KR `features/auth/components/auth-deferred-runner.tsx` 이식).
 *
 * 트리거: 로그인됨 && 로그인 화면을 벗어남(segments[0] !== AUTH_ROUTE_GROUP).
 * 실행 시점: InteractionManager.runAfterInteractions — 모달 닫힘 애니메이션과의 race 방지.
 *
 * RootLayout 에 1회 mount 한다(DeepLinkRunner 바로 뒤).
 */
export function AuthDeferredRunner() {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn');
  const segments = useSegments();
  // AUTH_ROUTE_GROUP 라우트가 없어 세그먼트 union 에도 없다 — 문자열 비교.
  const isOnAuth = (segments[0] as string | undefined) === AUTH_ROUTE_GROUP;

  useEffect(() => {
    if (!isSignedIn || isOnAuth) return;

    const intent = pendingDeepLinkIntent.consume();
    if (!intent) return;

    const handle = InteractionManager.runAfterInteractions(intent);
    return () => handle.cancel();
  }, [isSignedIn, isOnAuth]);

  return null;
}
