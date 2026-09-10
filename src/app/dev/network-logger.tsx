import { Stack } from 'expo-router';
import NetworkLogger from 'react-native-network-logger';

import { SafeArea } from '@/components/ui';

/** 개발 전용. 루트 Stack 이 headerShown: false 라 이 화면만 헤더를 켠다. */
export default function NetworkLoggerScreen() {
  return (
    <SafeArea className="flex-1" edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Network' }} />
      <NetworkLogger theme="dark" />
    </SafeArea>
  );
}
