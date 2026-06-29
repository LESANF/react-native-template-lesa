import { Stack } from 'expo-router';

import '../global.css';
import '@/lib/i18n';
import { loadSelectedTheme } from '@/lib/theme/selected-theme';
import { AppProviders } from '@/providers/app-providers';
import { GlobalOverlays } from '@/providers/global-overlays';

loadSelectedTheme();

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalOverlays />
    </AppProviders>
  );
}
