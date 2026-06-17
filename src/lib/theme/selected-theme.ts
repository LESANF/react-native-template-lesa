import { useCallback } from 'react';
import { useMMKVString } from 'react-native-mmkv';
import { Uniwind, useUniwind } from 'uniwind';

import { storage } from '@/lib/storage';

export const COLOR_SCHEMES = ['light', 'dark', 'system'] as const;

export type ColorScheme = (typeof COLOR_SCHEMES)[number];

const SELECTED_THEME_KEY = 'selected-theme';

function parseColorScheme(value: string | undefined): ColorScheme {
  switch (value) {
    case 'light':
    case 'dark':
    case 'system':
      return value;
    default:
      return 'system';
  }
}

export function loadSelectedTheme() {
  Uniwind.setTheme(parseColorScheme(storage.getString(SELECTED_THEME_KEY)));
}

export function useSelectedTheme() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const [storedTheme, setStoredTheme] = useMMKVString(SELECTED_THEME_KEY, storage);
  const selectedTheme = storedTheme === undefined && hasAdaptiveThemes ? 'system' : parseColorScheme(storedTheme ?? theme);

  const setSelectedTheme = useCallback((nextTheme: ColorScheme) => {
    Uniwind.setTheme(nextTheme);
    setStoredTheme(nextTheme);
  }, [setStoredTheme]);

  return { selectedTheme, setSelectedTheme } as const;
}
