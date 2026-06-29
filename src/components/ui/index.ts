import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';
import { withUniwind } from 'uniwind';

// UI Kit의 유일한 배럴. 화면/feature는 RN 시각 primitive를 여기서 가져온다.
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
export { Placeholder } from './placeholder';
export { Pressable } from './pressable';
export { Text } from './text';
export { GlobalToast, toast } from './toast';

// className이 필요한 외부 primitive만 얇게 감싼다. 무거운 옵션 컴포넌트는 여기로 올리지 않는다.
export const SafeAreaView = withUniwind(RNSafeAreaView);
export const StyledSvg = withUniwind(Svg);
