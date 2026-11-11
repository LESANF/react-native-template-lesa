import { NavigationBar } from 'expo-navigation-bar';
import { useIsFocused } from 'expo-router/react-navigation';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { Platform } from 'react-native';

export type ScreenSystemBarsProps = { hidden?: boolean; style?: StatusBarStyle };

// 포커스된 화면만 시스템 바를 정한다. Android 내비게이션 바도 같은 style 을 따른다("dark" = 어두운 아이콘).
export function ScreenSystemBars({ hidden, style = 'auto' }: ScreenSystemBarsProps) {
  const isFocused = useIsFocused();

  if (!isFocused) return null;

  return (
    <>
      <StatusBar hidden={hidden} style={style} />
      {Platform.OS === 'android' && <NavigationBar hidden={hidden} style={style} />}
    </>
  );
}
