import { type NavigationState, type PartialState, CommonActions } from 'expo-router/react-navigation';
import { type Href, useNavigationContainerRef } from 'expo-router';
import { useCallback } from 'react';

import { tabRoutes } from '@/constants/tabs';

export class NavigationResetError extends Error {
  readonly code: 'empty-route' | 'unknown-tab';

  constructor(code: 'empty-route' | 'unknown-tab', message: string) {
    super(message);
    this.name = 'NavigationResetError';
    this.code = code;
  }
}

type RouteParams = Record<string, unknown>;
type NavigationResetState = PartialState<NavigationState>;
type NavigationRouteEntry = NavigationResetState['routes'][number];
// 탭 이름 union — matcher 의 reset 추론이 이 타입으로 좁힌다(아이콘/에셋을 끌고 오지 않는 타입 전용 통로).
export type NavigationTabName = (typeof tabRoutes)[number]['name'];

// expo-router가 모든 앱 라우트를 감싸는 숨은 루트 네비게이터 이름. reset 페이로드는 실제
// 상태 트리와 모양이 일치해야 해서 이 래퍼 없이는 reset이 깨진다(실측 확인).
// 공개 API가 아닌 내부값이므로 SDK 업그레이드 시 expo-router/build/constants.js 의
// INTERNAL_SLOT_NAME('__root')과 여전히 일치하는지 확인할 것. (SDK 57 / expo-router 57.0.17 일치 확인)
const ROOT_NAVIGATION_ROUTE_NAME = '__root';
const TABS_ROUTE_NAME = '(tabs)';
const DEFAULT_TAB_STACK = ['index'] as const;
const tabNames: readonly NavigationTabName[] = tabRoutes.map((tab) => tab.name);

// 호출부에서 넘기는 reset 입력값들.
export type NavigationResetStackEntry =
  | string
  | {
      readonly name: string;
      readonly params?: RouteParams;
    };

// (tabs) 위에 쌓을 루트 라우트. 동적/중첩 라우트는 nested 로 이어 붙인다.
export type NavigationResetNestedRoute = {
  readonly name: string;
  readonly params?: RouteParams;
  readonly nested?: readonly NavigationResetNestedRoute[];
};

export type NavigationResetTopRoute = string | NavigationResetNestedRoute;

// tab/stack 은 탭 내부를 재구성하고, topRoute 는 탭 바깥 루트 스택 위에 올린다.
export type NavigationResetToTabOptions = {
  readonly tab: NavigationTabName;
  readonly stack?: readonly NavigationResetStackEntry[];
  readonly topRoute?: NavigationResetTopRoute;
};

export type NavigationResetTarget = Href | NavigationResetToTabOptions;

function isResetToTabOptions(target: NavigationResetTarget): target is NavigationResetToTabOptions {
  return typeof target === 'object' && 'tab' in target;
}

// 문자열/객체/nested 입력을 React Navigation route entry 로 바꾼다.
function buildNestedRoute(route: NavigationResetTopRoute): NavigationRouteEntry {
  if (typeof route === 'string') {
    return { name: route };
  }

  if (!route.nested || route.nested.length === 0) {
    return route.params ? { name: route.name, params: route.params } : { name: route.name };
  }

  return {
    name: route.name,
    ...(route.params ? { params: route.params } : {}),
    state: {
      index: route.nested.length - 1,
      routes: route.nested.map(buildNestedRoute),
    },
  };
}

function buildStackEntry(entry: NavigationResetStackEntry): NavigationRouteEntry {
  if (typeof entry === 'string') {
    return { name: entry };
  }

  return entry.params ? { name: entry.name, params: entry.params } : { name: entry.name };
}

function getStackEntryName(entry: NavigationResetStackEntry): string {
  return typeof entry === 'string' ? entry : entry.name;
}

function getTargetStack(
  target: NavigationResetToTabOptions,
): readonly NavigationResetStackEntry[] {
  return target.stack && target.stack.length > 0 ? target.stack : DEFAULT_TAB_STACK;
}

// 전체 탭 목록을 만들되, 활성 탭에만 내부 stack 을 심는다.
function buildTabRoute(
  tabName: NavigationTabName,
  target: NavigationResetToTabOptions,
): NavigationRouteEntry {
  const stack = getTargetStack(target);

  if (tabName !== target.tab) {
    return { name: tabName };
  }

  if (stack.length === 1) {
    const onlyEntry = stack[0];
    const onlyName = getStackEntryName(onlyEntry);
    if (onlyName === tabName || onlyName === 'index') {
      // leaf/default 탭은 Expo Router 가 기본 child 를 해석하게 두는 편이 안전하다.
      return typeof onlyEntry === 'string' || !onlyEntry.params
        ? { name: tabName }
        : { name: tabName, params: onlyEntry.params };
    }
  }

  return {
    name: tabName,
    state: {
      index: stack.length - 1,
      routes: stack.map(buildStackEntry),
    },
  };
}

// Expo Router 앱 라우트는 React Navigation tree 의 __root 아래에 들어간다.
function buildRootResetPayload(innerRoutes: NavigationRouteEntry[]): NavigationResetState {
  return {
    index: 0,
    routes: [
      {
        name: ROOT_NAVIGATION_ROUTE_NAME,
        state: {
          index: innerRoutes.length - 1,
          routes: innerRoutes,
        },
      },
    ],
  };
}

function buildTabsResetPayload(target: NavigationResetToTabOptions): NavigationResetState {
  const tabIndex = tabNames.indexOf(target.tab);
  if (tabIndex === -1) {
    throw new NavigationResetError(
      'unknown-tab',
      `useNavigationReset: unknown tab "${target.tab}". Update tabs first.`,
    );
  }

  const tabsRoute: NavigationRouteEntry = {
    name: TABS_ROUTE_NAME,
    state: {
      index: tabIndex,
      routes: tabNames.map((tabName) => buildTabRoute(tabName, target)),
    },
  };
  const innerRoutes = target.topRoute ? [tabsRoute, buildNestedRoute(target.topRoute)] : [tabsRoute];

  return buildRootResetPayload(innerRoutes);
}

function stripLeadingSlash(pathname: string): string {
  return pathname.startsWith('/') ? pathname.slice(1) : pathname;
}

function buildHrefResetPayload(target: Href): NavigationResetState {
  const pathname = typeof target === 'string' ? target : target.pathname;
  const routeName = stripLeadingSlash(pathname);

  if (!routeName) {
    throw new NavigationResetError('empty-route', 'useNavigationReset: route must not be empty.');
  }

  if (typeof target === 'string' || !target.params) {
    return buildRootResetPayload([{ name: routeName }]);
  }

  return buildRootResetPayload([{ name: routeName, params: target.params }]);
}

// CommonActions.reset 을 감싼 앱 전용 reset 훅.
export function useNavigationReset(): (target: NavigationResetTarget) => void {
  const navigation = useNavigationContainerRef();

  return useCallback(
    (target: NavigationResetTarget) => {
      navigation.dispatch(
        CommonActions.reset(
          isResetToTabOptions(target) ? buildTabsResetPayload(target) : buildHrefResetPayload(target),
        ),
      );
    },
    [navigation],
  );
}
