import { Link } from 'expo-router';

import { Pressable, Text, View } from '@/components/ui';

export function Menu4Screen() {
  return (
    <View className="flex-1 gap-3 bg-background p-4">
      <Text variant="heading-lg">Menu 4</Text>
      <Text color="muted">동적 라우트 예시 — 상세는 [id].tsx 가 받는다.</Text>
      <Link href="/menu-4/1" asChild>
        <Pressable className="rounded-xl border border-border bg-card p-4">
          <Text>예시 상세 /menu-4/1 →</Text>
        </Pressable>
      </Link>
    </View>
  );
}
