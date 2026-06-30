import { useIsFocused } from '@react-navigation/native';
import { SystemBars, type SystemBarsProps } from 'react-native-edge-to-edge';

export type ScreenSystemBarsProps = SystemBarsProps;

export function ScreenSystemBars({
  hidden,
  style = 'auto',
}: ScreenSystemBarsProps) {
  const isFocused = useIsFocused();

  if (!isFocused) return null;

  return <SystemBars hidden={hidden} style={style} />;
}
