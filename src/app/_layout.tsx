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
import { useDismissKeyboardOnBackground } from '@/hooks/use-dismiss-keyboard-on-background';
import { useNavigationReset } from '@/hooks/use-navigation-reset';
import { queryClient } from '@/lib/api/query-client';
import { setupReactQueryNativeListeners } from '@/lib/api/react-query-native-listeners';
import { loadSelectedTheme } from '@/lib/theme/selected-theme';
import { AppProviders } from '@/providers/app-providers';
import { AuthDeferredRunner } from '@/providers/auth-deferred-runner';
import { DeepLinkRunner } from '@/providers/deep-link-runner';
import { GlobalOverlays } from '@/providers/global-overlays';
import { hydrateAuth, useAuthStore } from '@/stores/auth-store';

// strict → warn. 오류는 그대로 출력된다. `docs/routing.md`.
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

// 가려진 화면 리렌더 동결. 3장 이상 깊이부터 효과 — `docs/routing.md`.
enableFreeze(true);

// 부팅 ① 동기 모듈 로드. splash 를 건너뛰는 진입에도 실행된다.
loadSelectedTheme();
setupReactQueryNativeListeners();
hydrateAuth();

// 여기서 잡아야 한다 — 훅 안은 늦다. 해제는 useSplashInitializer 의 finally.
SplashScreen.preventAutoHideAsync();
// URL 이 비면 건너뛴다.
if (Env.urls.ota) HotUpdater.init({ baseURL: Env.urls.ota });

// 아래 Stack 의 initialRouteName 과 **같아야** 한다. expo-router 는 여기서만 읽는다.
export const unstable_settings = { anchor: 'splash' };

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorFallback error={error} reset={retry} />;
}

export default function RootLayout() {
  const resetNavigation = useNavigationReset();
  useDismissKeyboardOnBackground();

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
