/**
 * 탭 정의 — 라우트·라벨·아이콘은 여기서만 바꾼다.
 *
 * [아이콘 교체 컨벤션 — 사용자는 이 네 단계만]
 * 1. assets/icons/tabs/<name>.svg 를 넣는다 (32×32 viewBox, 단색 path, fill="black").
 * 2. `pnpm icons:tabs` → <name>.png/@2x/@3x(기본색)와 <name>-selected*(선택색) 6장 생성.
 *    NativeTabs(iOS 26·Android)가 이 PNG 쌍을 쓴다. 색은 scripts/gen-tab-icons.sh 상단 두 값.
 * 3. components/icons/tabs.tsx 에 같은 path로 SVG 컴포넌트를 추가한다 —
 *    NativeTabs를 못 쓰는 fallback 커스텀 탭바가 color prop으로 칠한다.
 * 4. 아래 tabRoutes(순수 데이터)와 tabs(아이콘 매핑)에 한 줄씩 추가한다.
 *    폴더 탭은 그 폴더에 _layout.tsx 가 있어야 등록된다(없으면 조용히 빠진다).
 */
import type { ComponentType } from 'react';
import type { ImageSourcePropType } from 'react-native';

import {
  BrandTabIcon,
  FilterTabIcon,
  HomeTabIcon,
  LoginTabIcon,
  ShopTabIcon,
  type TabIconProps,
} from '@/components/icons/tabs';
import brandNativeIcon from '@/assets/icons/tabs/brand.png';
import brandNativeSelectedIcon from '@/assets/icons/tabs/brand-selected.png';
import filterNativeIcon from '@/assets/icons/tabs/filter.png';
import filterNativeSelectedIcon from '@/assets/icons/tabs/filter-selected.png';
import homeNativeIcon from '@/assets/icons/tabs/home.png';
import homeNativeSelectedIcon from '@/assets/icons/tabs/home-selected.png';
import loginNativeIcon from '@/assets/icons/tabs/login.png';
import loginNativeSelectedIcon from '@/assets/icons/tabs/login-selected.png';
import shopNativeIcon from '@/assets/icons/tabs/shop.png';
import shopNativeSelectedIcon from '@/assets/icons/tabs/shop-selected.png';

type NativeTabIcon = {
  readonly default: ImageSourcePropType;
  readonly selected: ImageSourcePropType;
};

type TabConfig = {
  readonly route: (typeof tabRoutes)[number];
  readonly icon: ComponentType<TabIconProps>;
  readonly nativeIcon: NativeTabIcon;
};

// 순수 route 데이터. 네비게이션 유틸은 아이콘 의존 없이 이 배열만 읽는다.
export const tabRoutes = [
  { name: 'index', label: 'HOME', href: '/(tabs)' },
  { name: 'menu-2', label: 'SHOP', href: '/(tabs)/menu-2' },
  { name: 'menu-3', label: 'BRAND', href: '/(tabs)/menu-3' },
  { name: 'menu-4', label: 'FILTER', href: '/(tabs)/menu-4' },
  { name: 'menu-5', label: 'LOGIN', href: '/(tabs)/menu-5' },
] as const;

export const tabs = [
  {
    route: tabRoutes[0],
    icon: HomeTabIcon,
    nativeIcon: { default: homeNativeIcon, selected: homeNativeSelectedIcon },
  },
  {
    route: tabRoutes[1],
    icon: ShopTabIcon,
    nativeIcon: { default: shopNativeIcon, selected: shopNativeSelectedIcon },
  },
  {
    route: tabRoutes[2],
    icon: BrandTabIcon,
    nativeIcon: { default: brandNativeIcon, selected: brandNativeSelectedIcon },
  },
  {
    route: tabRoutes[3],
    icon: FilterTabIcon,
    nativeIcon: { default: filterNativeIcon, selected: filterNativeSelectedIcon },
  },
  {
    route: tabRoutes[4],
    icon: LoginTabIcon,
    nativeIcon: { default: loginNativeIcon, selected: loginNativeSelectedIcon },
  },
] as const satisfies readonly TabConfig[];
