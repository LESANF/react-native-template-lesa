import LottieView from 'lottie-react-native';
import { useMemo, useRef, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

import dotLoadingWhite from '@/assets/json/dot-loading-white.json';
import { throttle } from '@/utils/throttle';

import { Text } from './text';

const button = tv({
  slots: {
    root: 'flex-row items-center justify-center gap-2 rounded-xl',
    text: 'text-center',
  },
  variants: {
    variant: {
      primary: { root: 'bg-primary px-5', text: 'text-primary-foreground' },
      secondary: { root: 'border border-border bg-card px-5', text: 'text-foreground' },
      ghost: { root: 'bg-transparent', text: 'text-foreground' },
      link: { root: 'bg-transparent', text: 'text-foreground underline' },
    },
    size: {
      lg: { root: 'h-11' },
      sm: { root: 'h-9 px-3' },
    },
    disabled: { true: {} },
    loading: { true: { root: 'opacity-60' } },
  },
  compoundVariants: [
    {
      variant: 'primary',
      disabled: true,
      loading: false,
      class: { root: 'bg-muted', text: 'text-muted-foreground' },
    },
    {
      variant: 'secondary',
      disabled: true,
      loading: false,
      class: { text: 'text-muted-foreground' },
    },
    { variant: ['ghost', 'link'], class: { root: 'h-auto self-start px-0' } },
  ],
  defaultVariants: { variant: 'primary', size: 'lg', loading: false },
});

type ButtonVariants = VariantProps<typeof button>;

export type ButtonProps = {
  children: ReactNode;
  loading?: boolean;
  /** 기본은 더블탭 방지용 throttle on. 입력 필드/반복 액션처럼 즉시 반응이 필요하면 끈다. */
  throttleDisabled?: boolean;
  className?: string;
} & PressableProps &
  Omit<ButtonVariants, 'loading' | 'disabled'>;

export function Button({
  children,
  variant,
  size,
  disabled,
  loading = false,
  className,
  throttleDisabled = false,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || loading;
  const styles = button({ variant, size, disabled: isDisabled, loading });
  const isCompact = variant === 'ghost' || variant === 'link';

  // 렌더 사이에 throttle은 유지하고, 실제 호출은 항상 최신 onPress를 바라보게 한다.
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const handlePress = useMemo(
    () =>
      throttleDisabled
        ? (e: GestureResponderEvent) => onPressRef.current?.(e)
        : throttle((e: GestureResponderEvent) => onPressRef.current?.(e)),
    [throttleDisabled],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={isCompact ? { top: 8, bottom: 8, left: 4, right: 4 } : undefined}
      className={styles.root({ className })}
      onPress={handlePress}
      {...props}>
      {loading ? (
        // 현재 로띠는 흰색 에셋이라 primary 계열 로딩에 맞춘다.
        <LottieView source={dotLoadingWhite} autoPlay loop style={{ width: 60, height: 60 }} />
      ) : typeof children === 'string' || typeof children === 'number' ? (
        <Text className={styles.text()}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
