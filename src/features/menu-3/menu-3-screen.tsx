import { Link } from 'expo-router';

import { Pressable, Text, View } from '@/components/ui';

export function Menu3Screen() {
  return (
    <View className="flex-1 gap-3 bg-background p-4">
      <Text variant="heading-lg">Menu 3</Text>
      <Text color="muted">중첩 스택 예시 — 같은 탭 안에서 하위 화면으로 push.</Text>
      <Link href="/menu-3/settings" asChild>
        <Pressable className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4">
          <Text>설정 (테마)</Text>
          <Text color="muted">›</Text>
        </Pressable>
      </Link>
    </View>
  );
}
