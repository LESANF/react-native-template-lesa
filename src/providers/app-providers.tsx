import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
        <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
