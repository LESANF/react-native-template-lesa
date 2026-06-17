import { Stack } from 'expo-router';

// 폴더 라우트가 NativeTabs 탭으로 잡히려면 _layout(Stack)이 필요하다.
// (index.tsx만 있는 폴더는 탭으로 등록되지 않음 — 단일 화면이어도 이 Stack 을 둔다.)
export default function Menu5StackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Menu 5' }} />
    </Stack>
  );
}
