import { useRouter } from 'expo-router';

import { Button, Text, View } from '@/components/ui';

export function Menu3DetailScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 gap-3 bg-background p-4">
      <Text variant="heading-lg">하위 화면</Text>
      <Text color="muted">
        같은 탭 스택 위에 push된 화면 — 스와이프나 아래 버튼으로 복귀합니다.
      </Text>
      <Button variant="ghost" size="sm" onPress={() => router.back()}>
        뒤로
      </Button>
    </View>
  );
}
