import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';

// menu-2 = 루트 모달 데모 (placeholder). 버튼 → 탭바 위로 뜨는 전역 모달.
export function Menu2Screen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg-primary p-6">
      <Text variant="heading-lg">Menu 2</Text>
      <Link href="/modal" asChild>
        <Pressable className="rounded-xl bg-layer-brand px-5 py-3">
          <Text color="inverse">루트 모달 열기 (탭바 위로)</Text>
        </Pressable>
      </Link>
    </View>
  );
}
