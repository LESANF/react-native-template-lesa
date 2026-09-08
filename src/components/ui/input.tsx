import { useState, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from './text';

const input = tv({
  slots: {
    root: 'gap-1.5',
    label: 'text-foreground',
    field: 'h-11 w-full rounded-xl border border-border bg-card px-4 text-base text-foreground',
    errorText: 'text-destructive',
  },
  variants: {
    focused: { true: { field: 'border-foreground' } },
    error: { true: { field: 'border-destructive', label: 'text-destructive' } },
    disabled: { true: { field: 'bg-muted text-muted-foreground' } },
  },
});

// RHF/zod 제어 입력은 별도 ControlledInput 으로.
export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  ref?: Ref<TextInput>;
};

export function Input({
  label,
  error,
  disabled,
  className,
  onFocus,
  onBlur,
  ref,
  // 시스템 폰트 스케일이 레이아웃을 깨는 것을 막는다(Text 와 동일).
  allowFontScaling = false,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  const styles = input({
    focused: focused && !hasError,
    error: hasError,
    disabled: Boolean(disabled),
  });

  return (
    <View className={styles.root()}>
      {label ? (
        <Text variant="label" className={styles.label()}>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        allowFontScaling={allowFontScaling}
        editable={!disabled}
        // Uniwind 는 placeholder 색을 accent prefix 로 추출한다.
        placeholderTextColorClassName="accent-muted-foreground"
        style={{ includeFontPadding: false, textAlignVertical: 'center' }}
        className={styles.field({ className })}
        onFocus={e => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {hasError ? (
        <Text variant="label" className={styles.errorText()}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
