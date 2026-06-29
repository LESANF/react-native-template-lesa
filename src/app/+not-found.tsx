import { Link } from 'expo-router';

import { Text, View } from '@/components/ui';

export default function NotFound() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background">
      <Text variant="heading-sm">페이지를 찾을 수 없어요</Text>
      <Link href="/">
        <Text color="primary">홈으로</Text>
      </Link>
    </View>
  );
}
