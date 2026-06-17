import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/ui';

// 동적 라우트 menu-4/[id] 의 상세. id 는 매칭 시 항상 존재(문서 보장).
export function Menu4DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 gap-2 bg-bg-primary p-4">
      <Text variant="heading-lg">상세 #{id}</Text>
      <Text color="secondary">menu-4/[id] 동적 라우트가 id 파라미터({id})를 받아 렌더했습니다.</Text>
    </View>
  );
}
