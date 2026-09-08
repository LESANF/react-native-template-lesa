import { HotUpdater } from '@hot-updater/react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { enableFreeze } from 'react-native-screens';

import '../global.css';
import '@/lib/i18n';
import { Env } from '@env';
import { ErrorFallback } from '@/components/ui';
import { useNavigationReset } from '@/hooks/use-navigation-reset';
import { queryClient } from '@/lib/api/query-client';
import { setupReactQueryNativeListeners } from '@/lib/api/react-query-native-listeners';
import { loadSelectedTheme } from '@/lib/theme/selected-theme';
import { AppProviders } from '@/providers/app-providers';
import { AuthDeferredRunner } from '@/providers/auth-deferred-runner';
import { DeepLinkRunner } from '@/providers/deep-link-runner';
import { GlobalOverlays } from '@/providers/global-overlays';
import { hydrateAuth, useAuthStore } from '@/stores/auth-store';

// strict 경고를 warn 으로 — 실제 오류는 여전히 출력된다. 사유는 docs/routing.md.
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

// 가려진 화면의 리렌더 동결. native-stack 은 최상단 바로 아래를 동결하지 않아 3장 이상
// 깊이부터 효과가 난다 — docs/routing.md.
enableFreeze(true);

// 부팅 ① 동기 모듈 로드 — splash 를 거치지 않는 진입(딥링크·푸시)에도 실행된다.
loadSelectedTheme();
setupReactQueryNativeListeners();
hydrateAuth();

// 네이티브 splash 는 여기서 잡는다 — 훅 안에서 잡으면 이미 늦다. 해제는
// useSplashInitializer 의 finally 단독 소유.
SplashScreen.preventAutoHideAsync();
// URL 이 비면 건너뛴다.
if (Env.urls.ota) HotUpdater.init({ baseURL: Env.urls.ota });

// anchor 는 아래 Stack 의 initialRouteName 과 같은 값이어야 한다 — expo-router 는 노드의
// initialRouteName 을 unstable_settings 에서만 만든다(빼면 자식 정렬·딥링크 랭킹이 모른다).
export const unstable_settings = { anchor: 'splash' };

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorFallback error={error} reset={retry} />;
}

export default function RootLayout() {
  const resetNavigation = useNavigationReset();

  useEffect(
    () =>
      useAuthStore.subscribe((state, prev) => {
        if (prev.status !== 'signedIn' || state.status !== 'signedOut') return;
        queryClient.clear();
        // TODO(앱): 홈+로그인 스택 등 프로젝트 리셋 정책으로 교체한다.
        resetNavigation('/(tabs)');
      }),
    [resetNavigation]
  );

  return (
    <AppProviders>
      {Platform.OS === 'android' && <SystemBars style="dark" />}
      {/* 라우트는 파일시스템 자동 등록. 옵션이 필요한 화면만 Stack.Screen으로 추가한다. */}
      <Stack initialRouteName="splash" screenOptions={{ headerShown: false }} />
      <GlobalOverlays />
      {/* 헤드리스 러너 — QueryProvider 안쪽이어야 한다. 딥링크 큐 바인딩·콜드 URL 캡처 */}
      <DeepLinkRunner />
      {/* auth 게이트가 미뤄둔 딥링크를 로그인 성공 후 재생한다 (KR 과 같은 순서) */}
      <AuthDeferredRunner />
    </AppProviders>
  );
}
