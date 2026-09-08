/**
 * 탭 아이콘 매핑. 교체 4단계는 `docs/ui.md`.
 * **폴더 탭은 `_layout.tsx` 가 있어야 등록된다** — 없으면 조용히 빠진다.
 */
import { tabRoutes } from './tab-routes';

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

// 순수 route 데이터는 `./tab-routes`.
export { tabRoutes } from './tab-routes';

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
