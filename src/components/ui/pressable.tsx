import { Pressable as RNPressable, type PressableProps } from 'react-native';

const DEFAULT_HIT_SLOP = 8;

export function Pressable({ hitSlop = DEFAULT_HIT_SLOP, ...props }: PressableProps) {
  return <RNPressable hitSlop={hitSlop} {...props} />;
}
