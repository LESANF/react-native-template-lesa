import { router, usePathname } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FAB_SIZE = 44;
const EDGE_GAP = 12;
// 탭바를 가리지 않는 초기 위치.
const BOTTOM_NAV_GAP = 76;
const LOGGER_ROUTE = '/dev/network-logger';

/**
 * 개발 전용 네트워크 로거 버튼. `__DEV__` 가드가 프로덕션에서 트리를 잘라낸다.
 * 가드와 구현을 나눈 이유: 훅보다 앞에서 return 하면 rules-of-hooks 위반.
 */
export function NetLogFab() {
  if (!__DEV__) return null;
  return <NetLogFabImpl />;
}

function NetLogFabImpl() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // 로거 화면 위에서는 숨긴다.
  const isVisible = !pathname?.startsWith(LOGGER_ROUTE);

  const minX = insets.left + EDGE_GAP;
  const maxX = screenWidth - insets.right - FAB_SIZE - EDGE_GAP;
  const minY = insets.top + EDGE_GAP;
  const maxY = screenHeight - insets.bottom - FAB_SIZE - EDGE_GAP;

  const translateX = useSharedValue(maxX);
  const translateY = useSharedValue(
    Math.max(minY, screenHeight - insets.bottom - FAB_SIZE - BOTTOM_NAV_GAP)
  );
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const gesture = useMemo(() => {
    const openLogger = () => router.push(LOGGER_ROUTE);

    const pan = Gesture.Pan()
      .onStart(() => {
        // `.value =` 직접 대입은 react-hooks/immutability 위반.
        startX.set(translateX.get());
        startY.set(translateY.get());
      })
      .onUpdate(event => {
        translateX.set(Math.max(minX, Math.min(startX.get() + event.translationX, maxX)));
        translateY.set(Math.max(minY, Math.min(startY.get() + event.translationY, maxY)));
      })
      .onEnd(() => {
        // 가까운 엣지로 스냅.
        const snapToLeft = translateX.get() + FAB_SIZE / 2 < screenWidth / 2;
        translateX.set(withSpring(snapToLeft ? minX : maxX));
      });

    const tap = Gesture.Tap().onEnd((_event, success) => {
      if (success) runOnJS(openLogger)();
    });

    // Race — 드래그가 시작되면 탭은 취소된다.
    return Gesture.Race(pan, tap);
  }, [startX, startY, translateX, translateY, screenWidth, minX, maxX, minY, maxY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }, { translateY: translateY.get() }],
    opacity: withSpring(isVisible ? 1 : 0),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityLabel="네트워크 로그 열기"
        accessibilityRole="button"
        pointerEvents={isVisible ? 'auto' : 'none'}
        style={[styles.fab, animatedStyle]}>
        {/* @expo/vector-icons 미설치 — 아이콘 의존을 만들지 않고 글리프로 표시한다. */}
        <Text allowFontScaling={false} style={styles.glyph}>
          ⇅
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  glyph: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 22,
    includeFontPadding: false,
  },
});
