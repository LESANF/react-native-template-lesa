import { Stack } from 'expo-router';

// menu-4 = 동적 라우트 탭 예시 — 목록(index)에서 [id] 상세로 push.
export default function Menu4StackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Menu 4' }} />
      <Stack.Screen name="[id]" options={{ title: '상세' }} />
    </Stack>
  );
}
