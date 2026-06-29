import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';
import { withUniwind } from 'uniwind';

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

export const SafeAreaView = withUniwind(RNSafeAreaView);
export const StyledSvg = withUniwind(Svg);
