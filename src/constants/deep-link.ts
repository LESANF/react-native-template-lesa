/** 필드 설명 `docs/routing.md`. app.config 가 import 하니 **런타임 import 금지**. */

import type { EntrySource, GateName, NavigateContext, ParsedDeepLink } from '@/lib/deep-link/types';

export const DEEP_LINK_HTTPS_HOSTS: readonly string[] = [
  // TODO(앱): 유니버설 링크 호스트. 비우면 https 는 noop.
];

export const SAFE_REDIRECT_PATH = '/splash';
export const SAFE_FALLBACK_PATH = '/(tabs)';
export const HANDLED_TTL_MS = 2000;
export const HANDLED_MAX = 50;
export const SPLASH_HANDOFF_DELAY_MS = 100;

// TODO(앱): 이 로그인 화면은 템플릿에 없다. 안 만들면 auth 게이트에서 +not-found.
export const AUTH_LOGIN_PATH = '/auth/login';
export const AUTH_ROUTE_GROUP = 'auth';

// ─── STATIC ────────────────────────────────────────────────────────────

export type StaticResetTopRoute =
  | string
  | {
      name: string;
      params?: Record<string, unknown>;
      nested?: StaticResetTopRoute extends infer T ? (T extends string ? never : T[]) : never;
    };

export type StaticResetSpec = {
  tab: string;
  stack: readonly (string | { name: string; params?: Record<string, unknown> })[];
  topRoute?: StaticResetTopRoute;
};

export type StaticRoute = {
  /** 선행 슬래시 없음. */
  appPaths: readonly string[];
  webPaths?: readonly string[];
  to: string;
  reset?: StaticResetSpec;
  gates?: readonly GateName[];
  whenAuthenticated?: { to: string; reset: StaticResetSpec };
};

// TODO(앱): 링크 스펙을 채운다. 아래는 예제.
export const STATIC_DEEP_LINK_ROUTES = {
  settings: { appPaths: ['settings'], to: '/(tabs)/menu-5' },
} as const satisfies Record<string, StaticRoute>;

// ─── EXTERNAL WEB PAGE ─────────────────────────────────────────────────

// TODO(앱): `app/external-web.tsx` 를 먼저 만든다. 없이 채우면 +not-found.
export const EXTERNAL_WEB_PAGE_PATTERNS: readonly RegExp[] = [];

// ─── DYNAMIC ───────────────────────────────────────────────────────────

export type DynamicRouteSpec = {
  /** `:` = named param. 선행 슬래시 없음. */
  appPattern: string;
  queryDriven?: string | readonly string[];
  toExpoPath: (params: Record<string, string>, query: Record<string, string>) => string;
  gates?: readonly GateName[];
  safeFallbackExpoPath?: string;
  navigate?: (
    parsed: ParsedDeepLink,
    entrySource: EntrySource,
    ctx: NavigateContext,
    params: Record<string, string>
  ) => void | Promise<void>;
};

// TODO(앱): 동적 세그먼트는 `navigate` 를 직접 주는 게 안전하다 — `docs/routing.md`.
export const DYNAMIC_ROUTES_SPEC = {
  menu4Detail: {
    appPattern: 'menu-4/:id',
    // 파라미터는 디코딩된 값이다 — 경로에 넣을 때 다시 인코딩한다(공백·슬래시·한글).
    toExpoPath: ({ id }, query) => {
      const search = new URLSearchParams(query).toString();
      const path = `/(tabs)/menu-4/${encodeURIComponent(id)}`;
      return search ? `${path}?${search}` : path;
    },
  },
} as const satisfies Record<string, DynamicRouteSpec>;

export const DEEP_LINK_FALLBACK_ROUTE = '/' as const;
