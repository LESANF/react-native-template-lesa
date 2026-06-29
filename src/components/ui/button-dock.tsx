import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tv } from 'tailwind-variants';

const MIN_BOTTOM_PADDING = 16;

const dock = tv({
  base: 'gap-3 border-t border-border bg-background px-4 pt-4',
});

export type ButtonDockProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly shadow?: boolean;
};

export function ButtonDock({ children, className, shadow = false }: ButtonDockProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom =
    Platform.OS === 'android'
      ? insets.bottom + MIN_BOTTOM_PADDING
      : Math.max(insets.bottom, MIN_BOTTOM_PADDING);

  return (
    <View className={dock({ className })} style={[shadow ? styles.shadow : null, { paddingBottom }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: 'black',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
});
