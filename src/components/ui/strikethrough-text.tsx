import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from './text';

const LINE_HEIGHT = 1.5;

const strikethrough = tv({
  slots: {
    root: 'justify-center self-start',
    line: 'absolute w-full',
  },
  variants: {
    color: {
      default: { line: 'bg-foreground' },
      muted: { line: 'bg-muted-foreground' },
      primary: { line: 'bg-primary' },
      primaryForeground: { line: 'bg-primary-foreground' },
      destructive: { line: 'bg-destructive' },
    },
  },
  defaultVariants: { color: 'muted' },
});

export type StrikethroughTextProps = ComponentProps<typeof Text>;

export function StrikethroughText({ color, className, ...props }: StrikethroughTextProps) {
  const styles = strikethrough({ color: color ?? 'muted' });

  return (
    <View className={styles.root({ className })}>
      <Text color={color ?? 'muted'} {...props} />
      {/* 글자 박스 중앙. 플랫폼별 픽셀 분기를 두지 않는다. */}
      <View
        className={styles.line()}
        style={{ height: LINE_HEIGHT, top: '50%', marginTop: -LINE_HEIGHT / 2 }}
      />
    </View>
  );
}
