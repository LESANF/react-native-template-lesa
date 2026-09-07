import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tv } from 'tailwind-variants';

import { toast, useOverlayStore } from '@/stores/overlay';

import { Text } from './text';

export { toast };
export type { ToastShowParams, ToastType } from '@/stores/overlay';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const toastRoot = tv({
  base: 'min-h-14 flex-row items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-md',
  variants: {
    type: {
      default: 'border-border',
      warning: 'border-warning',
      error: 'border-destructive',
      success: 'border-success',
    },
  },
});

const toastDot = tv({
  base: 'size-2.5 rounded-full',
  variants: {
    type: {
      default: 'bg-muted-foreground',
      warning: 'bg-warning',
      error: 'bg-destructive',
      success: 'bg-success',
    },
  },
});

export function GlobalToast() {
  const currentToast = useOverlayStore(state => state.toast);
  const { top } = useSafeAreaInsets();

  useEffect(() => {
    if (!currentToast || currentToast.duration <= 0) return;

    const timeout = setTimeout(() => {
      toast.hide(currentToast.id);
    }, currentToast.duration);

    return () => {
      clearTimeout(timeout);
    };
  }, [currentToast]);

  if (!currentToast) return null;

  const isStringContent =
    typeof currentToast.text1 === 'string' || typeof currentToast.text1 === 'number';

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <AnimatedPressable
        key={currentToast.id}
        accessibilityRole="button"
        entering={FadeInDown.duration(120)}
        exiting={FadeOutUp.duration(100)}
        className={toastRoot({ type: currentToast.type })}
        style={[styles.toast, { top: top + 12 }]}
        onPress={() => toast.hide(currentToast.id)}>
        <View className={toastDot({ type: currentToast.type })} />

        {isStringContent ? (
          <Text className="flex-1" numberOfLines={2}>
            {currentToast.text1}
          </Text>
        ) : (
          <View className="flex-1">{currentToast.text1}</View>
        )}

        {!currentToast.hideClose && (
          <Pressable
            accessibilityLabel="토스트 닫기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => toast.hide(currentToast.id)}>
            <Text className="text-xl/5 text-muted-foreground">×</Text>
          </Pressable>
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    left: 16,
    position: 'absolute',
    right: 16,
  },
});
