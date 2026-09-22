import type { ReactNode } from 'react';
import { Pressable } from 'react-native'; // ui 배럴을 가져오면 배럴 ↔ 아이콘 순환 import 가 생긴다.
import Svg from 'react-native-svg';

import type { IconProps } from './types';

type Props = Omit<IconProps, 'color' | 'size'> & {
  readonly width: number;
  readonly height: number;
  readonly viewBox: string;
  readonly children: ReactNode;
};

/** 모든 아이콘의 바탕. onPress 가 있으면 Pressable 로 감싸 버튼으로 만든다. */
export function Icon({ onPress, hitSlop = 16, accessibilityLabel, children, ...svgProps }: Props) {
  if (!onPress) {
    return (
      <Svg fill="none" accessibilityLabel={accessibilityLabel} {...svgProps}>
        {children}
      </Svg>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Svg fill="none" {...svgProps}>
        {children}
      </Svg>
    </Pressable>
  );
}
