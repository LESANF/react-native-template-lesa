import { Stack } from 'expo-router';
import NetworkLogger from 'react-native-network-logger';

import { SafeAreaView } from '@/components/ui';

/**
 * 개발 빌드 전용 네트워크 로그 화면 — NetLogFab 이 여기로 push 한다.
 * 루트 Stack 은 headerShown: false 라, 돌아갈 길을 만들려고 이 화면만 헤더를 켠다.
 */
export default function NetworkLoggerScreen() {
  return (
    <SafeAreaView className="flex-1" edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Network' }} />
      <NetworkLogger theme="dark" />
    </SafeAreaView>
  );
}
