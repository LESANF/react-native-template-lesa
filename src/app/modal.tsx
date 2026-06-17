import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';

// 루트 모달 예시 — (tabs)의 "형제"라 탭바까지 전체 위로 뜬다.
// 아무 화면에서 <Link href="/modal"> 또는 router.push('/modal') 로 연다.
// 탭 한정 모달이면 이 파일을 그 탭 폴더에 두고 해당 _layout 에 선언(그 탭에만 갇힘).
export default function Modal() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg-primary p-6">
      <Text variant="heading-lg">예시 모달</Text>
      <Text color="secondary" className="text-center">
        루트 Stack의 presentation: &apos;modal&apos; 화면. 탭바 위로 떠요.
      </Text>
      <Pressable onPress={() => router.back()} className="rounded-xl bg-layer-brand px-5 py-3">
        <Text color="inverse">닫기</Text>
      </Pressable>
    </View>
  );
}
