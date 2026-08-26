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
