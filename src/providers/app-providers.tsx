import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { QueryProvider } from '@/lib/api/query-provider';

// 전역 provider만 감싼다. 화면 위에 뜨는 toast/sheet/runner는 GlobalOverlays에 둔다.
export function AppProviders({ children }: { children: ReactNode }) {
  const { theme } = useUniwind();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {/* 키보드 애니메이션/인셋의 단일 소스 — 화면은 react-native-keyboard-controller 의 훅/컴포넌트를 쓴다. */}
        <KeyboardProvider>
          <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
            <QueryProvider>{children}</QueryProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
