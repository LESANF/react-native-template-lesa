import { Stack } from 'expo-router';

import '../global.css'; // Uniwind 스타일 (className 활성화)
import '@/lib/i18n'; // i18n init
import { loadSelectedTheme } from '@/lib/theme/selected-theme';
import { AppProviders } from '@/providers/app-providers';
import { GlobalOverlays } from '@/providers/global-overlays';

// ── ① 동기 모듈로드 셋업 (React 이전 1회) ──
// splash를 안 거치는 진입(딥링크/푸시)도 커버하는 자리. 동기적이고 가벼운 것만.
// 비동기 스타트업(prefetch·force-update·OTA·권한)은 lib/preloader 로 분리한다(#22).
loadSelectedTheme();

// 딥링크로 모달을 열 때 (tabs)를 배경으로 유지한다(배경 wipe 방지).
export const unstable_settings = { anchor: '(tabs)' };

// 루트 = 조립만 한다.
//   감싸는 것 → AppProviders (providers/app-providers.tsx)
//   네비게이션 → Stack (탭 밖 전역 화면은 (tabs)의 형제로 선언: modal, 추후 auth/상세 등)
//   띄우는 것 → GlobalOverlays (providers/global-overlays.tsx)
export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <GlobalOverlays />
    </AppProviders>
  );
}
