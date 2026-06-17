import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ErrorBoundary } from '@suspensive/react';
import { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { ErrorFallback } from '@/components/ui';

/**
 * 앱 전역 "감싸는 것"만 둔다 — context provider + 루트 에러 경계.
 * 화면 위에 "띄우는 것"(토스트·시트·헤드리스 러너)은 providers/global-overlays.tsx 로 분리.
 * (jp가 엉킨 이유 = 프로바이더 피라미드에 sibling/조건부 UI를 섞어서.)
 *
 * 추가 규칙: 새 프로바이더는 알맞은 계층 위치에 "한 줄" 감싸기.
 * 틀을 깨는 프로바이더(render-prop/조건부 등)도 여기선 그 모양 그대로 — 추상화로 강제하지 않는다.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const { theme } = useUniwind();

  return (
    // ── infra ──
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
          {/* ── data 계층: QueryProvider 등은 여기 (#15) ── */}
          {/* ── 루트 에러 경계 (토스 Suspensive). 화면별 세분화는 각 스크린에서 ── */}
          <ErrorBoundary fallback={ErrorFallback}>{children}</ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
