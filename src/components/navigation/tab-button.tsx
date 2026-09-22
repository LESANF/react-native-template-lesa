import { forwardRef, type ComponentType } from 'react';
import { Pressable, StyleSheet, type PressableProps, type View } from 'react-native';
import type { TabTriggerSlotProps } from 'expo-router/ui';

import { type TabIconProps } from '@/components/icons/tabs';
import { useColors } from '@/lib/theme/use-colors';

import { Text } from '../ui/text';

const TAB_ICON_SIZE = 32;

type TabIconComponent = ComponentType<TabIconProps>;

export type TabButtonProps = TabTriggerSlotProps & {
  readonly label: string;
  readonly icon: TabIconComponent;
  readonly testID?: string;
};

export const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { href: _href, icon: Icon, isFocused = false, label, style: _style, ...props },
  ref
) {
  const colors = useColors();
  const color = isFocused ? colors.tabActive : colors.tabInactive;
  const pressableProps: PressableProps = props;

  return (
    <Pressable
      ref={ref}
      accessibilityLabel={`${label} tab`}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      {...pressableProps}
      style={styles.root}>
      <Icon color={color} pointerEvents="none" size={TAB_ICON_SIZE} />
      <Text numberOfLines={1} style={[styles.label, { color }]}>
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
