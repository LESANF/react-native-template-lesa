import { NativeTabs } from "expo-router/unstable-native-tabs";

// 순정 네이티브 탭바 — iOS 26 리퀴드 글래스/morphing/스크롤 상호작용 전부 OS가 제공.
//
// 템플릿 기본 탭: 홈(index) + menu-2~5(갈아끼울 자리, generic 이름).
//   - 단일 화면 탭   = 폴더 + index.tsx            (menu-2, menu-5)
//   - 중첩 스택 탭   = 폴더 + _layout(Stack) + 하위 (menu-3 = settings 예시)
//   - 동적 라우트 탭 = 폴더 + _layout + [id].tsx    (menu-4 예시)
// 홈은 / 라우트라 index.tsx 로 둔다(파일). 트리거 name 은 라우트 세그먼트와 일치시킨다.
//
// ⚠️ sf= 는 "실제 SF Symbols 이름"이어야 한다. 틀리면(예: 존재 안 하는 심볼)
//    iOS에서 그 탭이 아이콘만이 아니라 통째로 안 뜬다(에러도 없이 조용히). 의심되면
//    SF Symbols 앱에서 정확한 이름 확인. md= 는 Android 머티리얼 심볼(아이콘 전용).
export default function TabsLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu-2">
        <NativeTabs.Trigger.Icon sf="heart.fill" md="favorite" />
        <NativeTabs.Trigger.Label>Menu 2</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu-3">
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        <NativeTabs.Trigger.Label>Menu 3</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu-4">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Menu 4</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu-5">
        <NativeTabs.Trigger.Icon sf="ellipsis.circle.fill" md="more_horiz" />
        <NativeTabs.Trigger.Label>Menu 5</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
