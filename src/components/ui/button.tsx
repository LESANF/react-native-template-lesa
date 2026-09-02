import LottieView from 'lottie-react-native';
import { useRef, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

import dotLoadingWhite from '@/assets/json/dot-loading-white.json';

import { Text } from './text';

const BUTTON_THROTTLE_MS = 500; // utils/throttle 기본값과 동일

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

  // 더블탭 방지: leading-edge 500ms. ref 읽기/쓰기를 이벤트 핸들러 안으로 한정해
  // react-hooks/refs 규칙을 지키면서, onPress는 항상 현재 렌더의 최신 값을 쓴다.
  const lastPressAtRef = useRef(0);
  const handlePress = (e: GestureResponderEvent) => {
    if (!throttleDisabled) {
      const now = Date.now();
      if (now - lastPressAtRef.current < BUTTON_THROTTLE_MS) return;
      lastPressAtRef.current = now;
    }
    onPress?.(e);
  };

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
