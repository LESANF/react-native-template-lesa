import { forwardRef, type ComponentType } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type View,
} from 'react-native';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { useCSSVariable } from 'uniwind';

import { type TabIconProps } from '@/components/icons/tabs';

import { Text } from '../ui/text';

const ACTIVE_COLOR_FALLBACK = '#18181b';
const INACTIVE_COLOR_FALLBACK = '#71717a';
const TAB_ICON_SIZE = 24;

type TabIconComponent = ComponentType<TabIconProps>;

export type TabButtonProps = TabTriggerSlotProps & {
  readonly label: string;
  readonly icon: TabIconComponent;
  readonly testID?: string;
};

function resolveColorToken(value: number | string | undefined, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  {
    href: _href,
    icon: Icon,
    isFocused = false,
    label,
    style: _style,
    ...props
  },
  ref,
) {
  const [primaryColorToken, inactiveColorToken] = useCSSVariable([
    '--color-primary',
    '--color-muted-foreground',
  ]);
  const activeColor = resolveColorToken(primaryColorToken, ACTIVE_COLOR_FALLBACK);
  const inactiveColor = resolveColorToken(inactiveColorToken, INACTIVE_COLOR_FALLBACK);
  const color = isFocused ? activeColor : inactiveColor;
  const pressableProps: PressableProps = props;

  return (
    <Pressable
      ref={ref}
      accessibilityLabel={`${label} tab`}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      {...pressableProps}
      style={styles.root}>
      <Icon
        active={isFocused}
        color={color}
        pointerEvents="none"
        size={TAB_ICON_SIZE}
      />
      <Text
        numberOfLines={1}
        style={[styles.label, { color }]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'column',
    gap: 4,
    justifyContent: 'flex-start',
  },
  label: {
    fontSize: 8,
    fontWeight: '500',
    lineHeight: 8,
    textAlign: 'center',
  },
});
