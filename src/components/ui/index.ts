import Svg from 'react-native-svg';
import { withUniwind } from 'uniwind';

// UI Kit 의 유일한 배럴.
export {
  ActivityIndicator,
  FlatList,
  ScrollView,
  SectionList,
  useWindowDimensions,
  View,
} from 'react-native';

export { Button } from './button';
export { ButtonDock } from './button-dock';
export { Dimmed } from './dimmed';
export type {
  DimmedColor,
  DimmedProps,
  DimmedVisualProps,
  DismissibleDimmedProps,
  LoadingDimmedProps,
} from './dimmed';
export { ErrorFallback } from './error-fallback';
export { Image } from './image';
export { Input } from './input';
export { NetLogFab } from './net-log-fab';
export { GlobalPopup, popup } from './popup';
export type { PopupChoice, PopupOptions } from './popup';
export { Pressable } from './pressable';
export { SafeArea } from './safe-area';
export type { SafeAreaProps } from './safe-area';
export { ScreenSystemBars } from './screen-system-bars';
export type { ScreenSystemBarsProps } from './screen-system-bars';
export { Text } from './text';
export { GlobalToast, toast } from './toast';

// className 이 필요한 외부 primitive 만 감싼다. 무거운 건 올리지 않는다.
export const StyledSvg = withUniwind(Svg);
