import LottieView from 'lottie-react-native';
import { useRef, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

import dotLoadingWhite from '@/assets/json/dot-loading-white.json';
import { useColors } from '@/lib/theme/use-colors';

import { Text } from './text';

const BUTTON_THROTTLE_MS = 500; // utils/throttle 기본값과 동일
const LOADING_SIZE = 60;
// 로띠 에셋의 레이어 이름. 에셋을 바꾸면 같이 확인한다.
const DOT_KEYPATHS = ['center', 'right', 'left'];

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
  /** 더블탭 방지 throttle. 즉시 반응이 필요하면 끈다. */
  throttleDisabled?: boolean;
  className?: string;
  /** 라벨만 덮어쓴다. root 는 className. */
  textClassName?: string;
} & PressableProps &
  Omit<ButtonVariants, 'loading' | 'disabled'>;

export function Button({
  children,
  variant,
  size,
  disabled,
  loading = false,
  className,
  textClassName,
  throttleDisabled = false,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || loading;
  const styles = button({ variant, size, disabled: isDisabled, loading });
  const isCompact = variant === 'ghost' || variant === 'link';
  const colors = useColors();

  // leading-edge 500ms. ref 접근을 핸들러 안으로 한정해 react-hooks/refs 를 지킨다.
  const lastPressAtRef = useRef(0);
  const handlePress = (e: GestureResponderEvent) => {
    if (!throttleDisabled) {
      const now = Date.now();
      if (now - lastPressAtRef.current < BUTTON_THROTTLE_MS) return;
      lastPressAtRef.current = now;
    }
    onPress?.(e);
  };

  // 에셋은 흰색 하나. variant 마다 점 색을 토큰으로 바꾼다.
  const dotColor = variant === 'secondary' ? colors.foreground : colors.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={isCompact ? { top: 8, bottom: 8, left: 4, right: 4 } : undefined}
      className={styles.root({ className })}
      onPress={handlePress}
      {...props}>
      {/* ghost·link 는 로딩 중에도 라벨을 유지한다 — 60px 로띠가 줄 안에서 레이아웃을 깨뜨린다. */}
      {loading && !isCompact ? (
        <LottieView
          source={dotLoadingWhite}
          autoPlay
          loop
          colorFilters={DOT_KEYPATHS.map(keypath => ({ keypath, color: dotColor }))}
          style={loadingStyles.dots}
        />
      ) : typeof children === 'string' || typeof children === 'number' ? (
        <Text numberOfLines={1} className={styles.text({ className: textClassName })}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const loadingStyles = StyleSheet.create({
  dots: { height: LOADING_SIZE, width: LOADING_SIZE },
});
