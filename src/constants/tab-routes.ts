/**
 * 탭 route 데이터 — **아이콘·에셋 의존이 없다.**
 *
 * `constants/tabs.ts` 와 분리한 이유: 그쪽은 SVG 컴포넌트와 PNG 10장을 import 하므로,
 * 값으로 한 번만 참조해도 그 전부가 번들 그래프에 딸려온다. 딥링크 matcher 는
 * 헤드리스 체인(`index.js` → push/background → core → dispatcher → matcher) 안에 있어
 * React 컴포넌트·이미지가 들어오면 안 된다. 네비게이션 유틸도 아이콘이 필요 없다.
 *
 * 탭을 추가·변경할 때는 여기와 `constants/tabs.ts` 의 아이콘 매핑에 한 줄씩 넣는다
 * (교체 컨벤션은 `tabs.ts` 헤더 참고).
 */
export const tabRoutes = [
  { name: 'index', label: 'HOME', href: '/(tabs)' },
  { name: 'menu-2', label: 'MOTION', href: '/(tabs)/menu-2' },
  { name: 'menu-3', label: 'STACK', href: '/(tabs)/menu-3' },
  { name: 'menu-4', label: 'DYNAMIC', href: '/(tabs)/menu-4' },
  { name: 'menu-5', label: 'SETTINGS', href: '/(tabs)/menu-5' },
] as const;
