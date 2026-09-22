import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from './text';

// 높이·테두리는 field 뷰가 갖고 입력에는 글꼴 크기만 — 행간을 주면 안드로이드가 글자를 슬롯과 어긋나게 민다.
const input = tv({
  slots: {
    root: 'gap-1.5',
    label: 'text-foreground',
    field: 'h-11 w-full flex-row items-center gap-2 rounded-xl border border-border bg-card px-4',
    content: 'flex-1 flex-row items-center',
    text: 'flex-1 p-0 text-size-md text-foreground',
    message: 'text-muted-foreground',
  },
  variants: {
    focused: { true: { field: 'border-foreground' } },
    error: {
      true: { field: 'border-destructive', label: 'text-destructive', message: 'text-destructive' },
    },
    disabled: { true: { field: 'bg-muted', text: 'text-muted-foreground' } },
  },
});

// RHF/zod 제어 입력은 별도 ControlledInput 으로.
export type InputProps = Omit<TextInputProps, 'editable'> & {
  label?: string;
  /** 행 아래 안내 문구. error 가 있으면 error 가 대신 보인다. */
  hint?: string;
  error?: string;
  /** 입력 왼쪽·오른쪽 슬롯 — 아이콘, 글자 수, 단위. */
  left?: ReactNode;
  right?: ReactNode;
  /** 비활성 경로는 이것 하나. editable 은 타입에서 뺐다. */
  disabled?: boolean;
  className?: string;
  ref?: Ref<TextInput>;
};

export function Input({
  label,
  hint,
  error,
  left,
  right,
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
  const hasError = Boolean(error) && !disabled;
  const styles = input({
    focused: focused && !hasError && !disabled,
    error: hasError,
    disabled: Boolean(disabled),
  });
  const message = hasError ? error : hint;

  return (
    <View className={styles.root()}>
      {label ? (
        <Text variant="label" className={styles.label()}>
          {label}
        </Text>
      ) : null}
      <View className={styles.field({ className })}>
        <View className={styles.content()}>
          {left}
          <TextInput
            ref={ref}
            allowFontScaling={allowFontScaling}
            editable={!disabled}
            // Uniwind 는 placeholder 색을 accent prefix 로 추출한다.
            placeholderTextColorClassName="accent-muted-foreground"
            style={textStyles.field}
            className={styles.text()}
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
        </View>
        {right}
      </View>
      {message ? (
        <Text variant="label" className={styles.message()}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const textStyles = StyleSheet.create({
  field: { includeFontPadding: false, textAlignVertical: 'center' },
});
