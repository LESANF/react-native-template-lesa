import type { ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

type HexColor = `#${string}`;
type RgbColor = `rgb(${string})`;
type HslColor = `hsl(${string})`;
type NamedDimmedColor = 'black' | 'white' | 'transparent';

export type DimmedColor = HexColor | RgbColor | HslColor | NamedDimmedColor;

type DimmedBaseProps = {
  readonly children?: ReactNode;
  readonly color?: DimmedColor;
  readonly opacity?: number;
};

type BlurredDimmedProps = {
  readonly blur: true;
  readonly blurAmount?: number;
};

type PlainDimmedProps = {
  readonly blur?: false;
  readonly blurAmount?: never;
};

export type DimmedVisualProps = DimmedBaseProps & (BlurredDimmedProps | PlainDimmedProps);

export type DismissibleDimmedProps = DimmedVisualProps & {
  readonly accessibilityLabel?: string;
  readonly loader?: false;
  readonly onPress?: () => void;
};

export type LoadingDimmedProps = DimmedVisualProps & {
  readonly accessibilityLabel?: string;
  readonly loader: true;
  readonly onPress?: never;
};

export type DimmedProps = DismissibleDimmedProps | LoadingDimmedProps;

// Dimmed는 store를 모른다. popup/sheet/loading 화면이 직접 렌더하고 생명주기를 소유한다.
const DEFAULT_BLUR_AMOUNT = 5;
const DEFAULT_SCRIM_COLOR = 'black';
const DEFAULT_SCRIM_OPACITY = 0.5;

function noop() {}

function clampOpacity(opacity: number) {
  return Math.max(0, Math.min(1, opacity));
}

export function Dimmed(props: DimmedProps) {
  const {
    blurAmount = DEFAULT_BLUR_AMOUNT,
    children,
    color = DEFAULT_SCRIM_COLOR,
    opacity = DEFAULT_SCRIM_OPACITY,
  } = props;
  const blur = props.blur === true;
  const loader = props.loader === true;
  const isDismissible = !loader && props.onPress !== undefined;
  const accessibilityLabel = props.accessibilityLabel ?? (loader ? 'Loading' : 'Close');
  const onBackdropPress = loader ? noop : (props.onPress ?? noop);

  return (
    <Animated.View
      entering={FadeIn.duration(50)}
      exiting={FadeOut.duration(20)}
      accessibilityViewIsModal
      className="items-center justify-center"
      style={StyleSheet.absoluteFill}>
      {blur && (
        <BlurView
          // community/blur의 blurAmount(0~10대) 감도를 expo-blur intensity(0~100)로 환산
          intensity={blurAmount * 10}
          tint="dark"
          // Android 기본은 반투명 틴트만 — 실제 블러를 원하면 이 실험 옵션이 필요
          experimentalBlurMethod="dimezisBlurView"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: clampOpacity(opacity) }]}
      />
      <Pressable
        accessibilityLabel={isDismissible ? accessibilityLabel : undefined}
        accessibilityRole={isDismissible ? 'button' : undefined}
        accessible={isDismissible}
        style={StyleSheet.absoluteFill}
        onPress={onBackdropPress}
      />
      {loader && (
        <View
          accessibilityLabel={accessibilityLabel}
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          accessible
          pointerEvents="none">
          <ActivityIndicator color="white" size="large" />
        </View>
      )}
      {children}
    </Animated.View>
  );
}
