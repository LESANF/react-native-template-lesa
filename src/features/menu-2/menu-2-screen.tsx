import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button, ScreenSystemBars, ScrollView, Text, View } from '@/components/ui';

const TRACK_WIDTH = 240;
const KNOB_SIZE = 44;
const METER_SIZE = 112;

function ExampleCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-4">
      <Text variant="heading-sm">{title}</Text>
      {children}
    </View>
  );
}

function TimingAndSpringExample() {
  const progress = useSharedValue(0);

  const knobStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], ['#64748b', '#16a34a']),
    transform: [{ translateX: progress.get() * (TRACK_WIDTH - KNOB_SIZE) }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: KNOB_SIZE + progress.get() * (TRACK_WIDTH - KNOB_SIZE),
  }));

  const toggle = () => {
    const nextProgress = progress.get() === 0 ? 1 : 0;
    progress.set(withSpring(nextProgress, { damping: 14, stiffness: 120 }));
  };

  return (
    <ExampleCard title="Timing / Spring">
      <View className="items-center gap-4">
        <View className="justify-center rounded-full bg-muted" style={styles.track}>
          <Animated.View className="absolute h-11 rounded-full bg-primary/20" style={fillStyle} />
          <Animated.View className="size-11 rounded-full" style={knobStyle} />
        </View>
        <Button variant="secondary" onPress={toggle}>
          Toggle motion
        </Button>
      </View>
    </ExampleCard>
  );
}

function RepeatWorkletExample() {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.set(withRepeat(withTiming(1.18, { duration: 700 }), -1, true));
    rotation.set(withRepeat(withTiming(360, { duration: 1800 }), -1, false));

    return () => {
      cancelAnimation(scale);
      cancelAnimation(rotation);
    };
  }, [rotation, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { rotate: `${rotation.get()}deg` }],
  }));

  return (
    <ExampleCard title="Repeat worklet">
      <View className="items-center justify-center py-4">
        <Animated.View
          className="size-28 items-center justify-center rounded-2xl border border-primary bg-primary/10"
          style={pulseStyle}>
          <View className="size-9 rounded-lg bg-primary" />
        </Animated.View>
      </View>
    </ExampleCard>
  );
}

function DerivedReactionExample() {
  const progress = useSharedValue(0.25);
  const [status, setStatus] = useState('idle');
  const degrees = useDerivedValue(() => progress.get() * 270 - 135);

  useAnimatedReaction(
    () => progress.get() >= 0.75,
    (isHigh, wasHigh) => {
      if (isHigh === wasHigh) return;
      runOnJS(setStatus)(isHigh ? 'worklet: high' : 'worklet: normal');
    }
  );

  const meterStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.get(),
      [0, 0.75, 1],
      ['#0f172a', '#2563eb', '#dc2626']
    ),
    transform: [{ rotate: `${degrees.get()}deg` }],
  }));

  const addProgress = () => {
    const nextProgress = Math.min(1, progress.get() + 0.25);
    progress.set(withTiming(nextProgress, { duration: 260 }));
  };

  const resetProgress = () => {
    progress.set(withTiming(0.25, { duration: 260 }));
  };

  return (
    <ExampleCard title="Derived / runOnJS">
      <View className="items-center gap-4">
        <View className="items-center justify-center rounded-full bg-muted" style={styles.meter}>
          <Animated.View className="h-2 w-14 rounded-full" style={meterStyle} />
        </View>
        <Text color="muted">{status}</Text>
        <View className="w-full flex-row gap-2">
          <View className="flex-1">
            <Button variant="secondary" onPress={addProgress}>
              Step
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="ghost" onPress={resetProgress}>
              Reset
            </Button>
          </View>
        </View>
      </View>
    </ExampleCard>
  );
}

export function Menu2Screen() {
  return (
    <>
      <ScreenSystemBars style="light" />

      <ScrollView className="bg-background" contentContainerClassName="gap-4 p-4">
        <View className="gap-1">
          <Text variant="display">Menu 2</Text>
          <Text color="muted">Reanimated / Worklets smoke examples</Text>
        </View>

        <TimingAndSpringExample />
        <RepeatWorkletExample />
        <DerivedReactionExample />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  meter: {
    height: METER_SIZE,
    width: METER_SIZE,
  },
  track: {
    height: KNOB_SIZE,
    width: TRACK_WIDTH,
  },
});
