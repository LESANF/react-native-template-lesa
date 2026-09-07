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

// Reanimated 의 strict 경고(shared value 를 렌더 중 읽는 등)는 개발 중 잡음이 커서 warn 으로 낮춘다.
// 실제 오류는 여전히 출력된다. 롤백 = 이 블록 제거(기본값 strict).
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

// 가려진 화면의 React 리렌더를 동결한다 — blur 상태 화면이 스택에 쌓일 때 배경 렌더 비용을 차단.
// 타이머는 계속 돌고 렌더만 미뤄지며, 복귀 시 자동 해동된다.
// 주의: native-stack 은 최상단 "바로 아래" 화면은 의도적으로 동결하지 않는다(스와이프백 대응)
//       — 3장 이상 깊이부터 효과가 난다.
// 롤백: 이 줄 제거 시 전역 해제. 화면별 예외는 해당 Stack.Screen 의 freezeOnBlur: false.
enableFreeze(true);

// ① 동기 모듈 로드 — React 렌더 전, splash를 거치지 않는 진입(딥링크·푸시)에도 실행된다.
loadSelectedTheme();
setupReactQueryNativeListeners();
hydrateAuth();

// ② 비동기 프리로더는 app/splash → lib/preloader. 네이티브 splash는 여기서 잡고,
// 해제는 useSplashInitializer의 finally가 단독 소유한다. (훅 안에서 잡으면 이미 늦다)
SplashScreen.preventAutoHideAsync();
// KR 은 모듈 스코프에서 무조건 init 한다. 템플릿은 기본 OTA 서버가 없어 URL 이 비면 건너뛴다.
if (Env.urls.ota) HotUpdater.init({ baseURL: Env.urls.ota });

// anchor 는 아래 Stack 의 initialRouteName 과 **같은 값**이어야 한다.
// expo-router 는 라우트 노드의 initialRouteName 을 오직 unstable_settings 에서만 만든다
// (getRoutesCore.js: `anchor ?? initialRouteName`). JSX prop 은 navigator 로만 전달되므로,
// anchor 를 빼면 자식 정렬(useSortedScreens)과 딥링크 path→state 랭킹(isInitial)이
// splash 가 첫 화면인 것을 모른다. '(tabs)' 로 잡으면 반대로 splash 를 건너뛴다.
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
