import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';

// 중첩 스택 탭의 루트 — 같은 탭에서 하위 화면(settings)으로 push 하는 예시.
export function Menu3Screen() {
  return (
    <View className="flex-1 gap-3 bg-bg-primary p-4">
      <Text variant="heading-lg">Menu 3</Text>
      <Text color="secondary">중첩 스택 예시 — 같은 탭 안에서 하위 화면으로 push.</Text>
      <Link href="/menu-3/settings" asChild>
        <Pressable className="flex-row items-center justify-between rounded-xl border border-border-primary bg-bg-elevated p-4">
          <Text>설정 (테마)</Text>
          <Text color="tertiary">›</Text>
        </Pressable>
      </Link>
    </View>
  );
}
