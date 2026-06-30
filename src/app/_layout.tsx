import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

import '../global.css';
import '@/lib/i18n';
import { ErrorFallback } from '@/components/ui';
import { setupReactQueryNativeListeners } from '@/lib/api/react-query-native-listeners';
import { loadSelectedTheme } from '@/lib/theme/selected-theme';
import { AppProviders } from '@/providers/app-providers';
import { GlobalOverlays } from '@/providers/global-overlays';

// React 렌더 전 동기 셋업만 둔다. 비동기 부팅 작업은 later preloader 단계에서 분리한다.
loadSelectedTheme();
setupReactQueryNativeListeners();

// 루트 모달/딥링크가 탭 트리를 배경으로 유지해야 할 때 필요한 Expo Router anchor.
export const unstable_settings = { anchor: '(tabs)' };

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorFallback error={error} reset={retry} />;
}

export default function RootLayout() {
  return (
    <AppProviders>
      {Platform.OS === 'android' && <SystemBars style="dark" />}
      {/* 라우트는 파일시스템 자동 등록. 옵션이 필요한 화면만 Stack.Screen으로 추가한다. */}
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalOverlays />
    </AppProviders>
  );
}
