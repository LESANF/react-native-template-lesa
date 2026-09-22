import type { SvgProps } from 'react-native-svg';

export type IconProps = Omit<SvgProps, 'color' | 'width' | 'height' | 'onPress' | 'hitSlop'> & {
  readonly color?: string;
  /** 높이 기준 px. 기본값은 아이콘의 원본 프레임 크기. */
  readonly size?: number;
  /** 넘기면 아이콘이 버튼이 된다. */
  readonly onPress?: () => void;
  readonly hitSlop?: number;
};
