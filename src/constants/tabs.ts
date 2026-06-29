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

export const tabRoutes = [
  { name: 'index', label: 'Home' },
  { name: 'menu-2', label: 'Menu 2' },
  { name: 'menu-3', label: 'Menu 3' },
  { name: 'menu-4', label: 'Menu 4' },
  { name: 'menu-5', label: 'Menu 5' },
] as const;

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
