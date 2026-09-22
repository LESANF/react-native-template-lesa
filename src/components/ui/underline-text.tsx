import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from './text';

// textDecorationLine 은 두께·색을 못 정하고 플랫폼마다 위치가 다르다. 선은 뷰로 그린다 — docs/ui.md.
const underline = tv({
  slots: {
    root: 'self-start',
    line: 'w-full border-b',
  },
  variants: {
    color: {
      default: { line: 'border-foreground' },
      muted: { line: 'border-muted-foreground' },
      primary: { line: 'border-primary' },
      primaryForeground: { line: 'border-primary-foreground' },
      destructive: { line: 'border-destructive' },
    },
  },
  defaultVariants: { color: 'default' },
});

export type UnderlineTextProps = ComponentProps<typeof Text> & {
  /** 글자와 선 사이 간격(px). */
  gap?: number;
};

export function UnderlineText({ gap = 2, color, className, ...props }: UnderlineTextProps) {
  const styles = underline({ color: color ?? 'default' });

  return (
    <View className={styles.root({ className })}>
      <Text color={color} {...props} />
      <View className={styles.line()} style={{ marginTop: gap }} />
    </View>
  );
}
