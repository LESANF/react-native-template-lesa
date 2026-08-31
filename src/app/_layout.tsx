import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

import '../global.css';
import '@/lib/i18n';
import { ErrorFallback } from '@/components/ui';
import { useNavigationReset } from '@/hooks/use-navigation-reset';
import { queryClient } from '@/lib/api/query-client';
import { setupReactQueryNativeListeners } from '@/lib/api/react-query-native-listeners';
import { loadSelectedTheme } from '@/lib/theme/selected-theme';
import { AppProviders } from '@/providers/app-providers';
import { GlobalOverlays } from '@/providers/global-overlays';
import { hydrateAuth, useAuthStore } from '@/stores/auth-store';

loadSelectedTheme();
setupReactQueryNativeListeners();
hydrateAuth();

// 루트 모달/딥링크가 탭 트리를 배경으로 유지해야 할 때 필요한 Expo Router anchor.
export const unstable_settings = { anchor: '(tabs)' };

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
    [resetNavigation],
  );

  return (
    <AppProviders>
      {Platform.OS === 'android' && <SystemBars style="dark" />}
      {/* 라우트는 파일시스템 자동 등록. 옵션이 필요한 화면만 Stack.Screen으로 추가한다. */}
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalOverlays />
    </AppProviders>
  );
}
