import type { ComponentType } from 'react';

import {
  HomeTabIcon,
  Menu2TabIcon,
  Menu3TabIcon,
  Menu4TabIcon,
  Menu5TabIcon,
  type TabIconProps,
} from '@/components/icons/tabs';

type NativeTabIcon = {
  readonly sfSymbolName: string;
  readonly materialIconName: string;
};

type TabConfig = {
  readonly route: (typeof tabRoutes)[number];
  readonly nativeIcon: NativeTabIcon;
  readonly standardIcon: ComponentType<TabIconProps>;
};

// 순수 route 데이터. 네비게이션 유틸은 아이콘 의존 없이 이 배열만 읽는다.
export const tabRoutes = [
  { name: 'index', label: 'Home', href: '/(tabs)' },
  { name: 'menu-2', label: 'Menu 2', href: '/(tabs)/menu-2' },
  { name: 'menu-3', label: 'Menu 3', href: '/(tabs)/menu-3' },
  { name: 'menu-4', label: 'Menu 4', href: '/(tabs)/menu-4' },
  { name: 'menu-5', label: 'Menu 5', href: '/(tabs)/menu-5' },
] as const;

// 탭바 렌더링용 visual config. Liquid Glass는 nativeIcon, Standard 탭은 standardIcon을 쓴다.
export const tabs = [
  {
    route: tabRoutes[0],
    nativeIcon: { sfSymbolName: 'house.fill', materialIconName: 'home' },
    standardIcon: HomeTabIcon,
  },
  {
    route: tabRoutes[1],
    nativeIcon: { sfSymbolName: 'heart.fill', materialIconName: 'favorite' },
    standardIcon: Menu2TabIcon,
  },
  {
    route: tabRoutes[2],
    nativeIcon: { sfSymbolName: 'person.fill', materialIconName: 'person' },
    standardIcon: Menu3TabIcon,
  },
  {
    route: tabRoutes[3],
    nativeIcon: { sfSymbolName: 'magnifyingglass', materialIconName: 'search' },
    standardIcon: Menu4TabIcon,
  },
  {
    route: tabRoutes[4],
    nativeIcon: {
      sfSymbolName: 'ellipsis.circle.fill',
      materialIconName: 'more_horiz',
    },
    standardIcon: Menu5TabIcon,
  },
] as const satisfies readonly TabConfig[];
