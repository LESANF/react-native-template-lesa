import { Stack } from 'expo-router';

// menu-3 = 중첩 스택 탭 예시 — 목록(index)에서 하위 화면(settings)으로 push.
export default function Menu3StackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Menu 3' }} />
      <Stack.Screen name="settings" options={{ title: '설정' }} />
    </Stack>
  );
}
