/** 아이콘 의존 없는 순수 데이터 — 헤드리스 체인이 읽는다. */
// TODO(앱): 앱의 탭 구성으로 교체. 아이콘 매핑은 `tabs.ts`.
export const tabRoutes = [
  { name: 'index', label: 'HOME', href: '/(tabs)' },
  { name: 'menu-2', label: 'MOTION', href: '/(tabs)/menu-2' },
  { name: 'menu-3', label: 'STACK', href: '/(tabs)/menu-3' },
  { name: 'menu-4', label: 'DYNAMIC', href: '/(tabs)/menu-4' },
  { name: 'menu-5', label: 'SETTINGS', href: '/(tabs)/menu-5' },
] as const;
