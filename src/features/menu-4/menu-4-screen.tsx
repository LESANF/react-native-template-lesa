import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';

// 동적 라우트 탭의 루트 — 상세는 같은 폴더의 [id].tsx 가 처리(menu-4/1 등).
export function Menu4Screen() {
  return (
    <View className="flex-1 gap-3 bg-bg-primary p-4">
      <Text variant="heading-lg">Menu 4</Text>
      <Text color="secondary">동적 라우트 예시 — 상세는 [id].tsx 가 받는다.</Text>
      <Link href="/menu-4/1" asChild>
        <Pressable className="rounded-xl border border-border-primary bg-bg-elevated p-4">
          <Text>예시 상세 /menu-4/1 →</Text>
        </Pressable>
      </Link>
    </View>
  );
}
