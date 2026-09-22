import { useMemo } from 'react';
import { useCSSVariable } from 'uniwind';

// className 을 못 받는 곳(SVG·로띠·Reanimated 스타일)에서 쓰는 색. CSS 토큰을 읽고 테마를 따라간다.
const TOKENS = {
  background: '--color-background',
  foreground: '--color-foreground',
  card: '--color-card',
  muted: '--color-muted',
  mutedForeground: '--color-muted-foreground',
  primary: '--color-primary',
  primaryForeground: '--color-primary-foreground',
  success: '--color-success',
  warning: '--color-warning',
  destructive: '--color-destructive',
  border: '--color-border',
  tabActive: '--color-tab-active',
  tabInactive: '--color-tab-inactive',
} as const;

export type ColorName = keyof typeof TOKENS;
export type Colors = Readonly<Record<ColorName, string>>;

const NAMES = Object.keys(TOKENS) as ColorName[];
const VARIABLES = NAMES.map(name => TOKENS[name]);

export function useColors(): Colors {
  const values = useCSSVariable(VARIABLES);
  return useMemo(
    () => Object.fromEntries(NAMES.map((name, i) => [name, String(values[i])])) as Colors,
    [values]
  );
}
