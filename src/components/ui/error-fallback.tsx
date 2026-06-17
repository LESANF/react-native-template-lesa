import { Pressable, View } from 'react-native';

import { Text } from './text'; // 같은 ui 폴더라 sibling 직접 import (barrel 순환 방지)

// ErrorBoundary(@suspensive/react) 공용 fallback. 루트(app-providers) + 화면별 경계에서 재사용.
export function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg-primary p-6">
      <Text variant="heading-sm">문제가 발생했어요</Text>
      <Text color="secondary" className="text-center">
        {error.message}
      </Text>
      <Pressable onPress={reset} className="rounded-xl bg-layer-brand px-5 py-3">
        <Text color="inverse">다시 시도</Text>
      </Pressable>
    </View>
  );
}
