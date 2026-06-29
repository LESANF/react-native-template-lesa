import { Pressable, View } from 'react-native';

import { Text } from './text';

export function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text variant="heading-sm">문제가 발생했어요</Text>
      <Text color="muted" className="text-center">
        {error.message}
      </Text>
      <Pressable onPress={reset} className="rounded-xl bg-primary px-5 py-3">
        <Text color="primaryForeground">다시 시도</Text>
      </Pressable>
    </View>
  );
}
