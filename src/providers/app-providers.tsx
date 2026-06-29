import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ErrorBoundary } from '@suspensive/react';
import { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { ErrorFallback } from '@/components/ui';

// 전역 provider만 감싼다. 화면 위에 뜨는 toast/sheet/runner는 GlobalOverlays에 둔다.
export function AppProviders({ children }: { children: ReactNode }) {
  const { theme } = useUniwind();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
          <ErrorBoundary fallback={ErrorFallback}>{children}</ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
