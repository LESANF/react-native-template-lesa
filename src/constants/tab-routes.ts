/**
 * 탭 route 데이터 — 아이콘·에셋 의존 없음.
 * `tabs.ts` 는 SVG·PNG 를 import 하므로, 헤드리스 체인의 딥링크 matcher 가 값으로 읽으려면
 * 분리가 필요하다. 탭 추가는 여기 + `tabs.ts` 아이콘 매핑에 한 줄씩.
 */
export const tabRoutes = [
  { name: 'index', label: 'HOME', href: '/(tabs)' },
  { name: 'menu-2', label: 'MOTION', href: '/(tabs)/menu-2' },
  { name: 'menu-3', label: 'STACK', href: '/(tabs)/menu-3' },
  { name: 'menu-4', label: 'DYNAMIC', href: '/(tabs)/menu-4' },
  { name: 'menu-5', label: 'SETTINGS', href: '/(tabs)/menu-5' },
] as const;
