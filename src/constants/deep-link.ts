/**
 * 딥링크 spec 테이블. 필드 설명은 `docs/routing.md` "딥링크 스펙 테이블".
 * `app.config.ts` 가 이 파일을 import 한다 — 런타임 import 를 넣으면 prebuild 가 깨진다.
 */

import type { EntrySource, GateName, NavigateContext, ParsedDeepLink } from '@/lib/deep-link/types';

export const DEEP_LINK_HTTPS_HOSTS: readonly string[] = [
  // TODO(앱): 유니버설 링크 호스트 (예: 'www.example.com'). 비우면 https 링크는 noop.
];

export const SAFE_REDIRECT_PATH = '/splash';
export const SAFE_FALLBACK_PATH = '/(tabs)';
export const HANDLED_TTL_MS = 2000;
export const HANDLED_MAX = 50;
export const SPLASH_HANDOFF_DELAY_MS = 100;

// TODO(앱): 이 두 값이 가리키는 로그인 화면은 템플릿에 없다 — 만들지 않으면 auth 게이트가
// 발동할 때 +not-found 로 떨어진다 (KR: `/auth/login` 모달).
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
  /** 선행 슬래시 없음 — parser 가 그렇게 정규화한다. */
  appPaths: readonly string[];
  webPaths?: readonly string[];
  to: string;
  reset?: StaticResetSpec;
  gates?: readonly GateName[];
  whenAuthenticated?: { to: string; reset: StaticResetSpec };
};

// TODO(앱): 앱의 링크 스펙을 한 줄씩 채운다. 아래는 예제 하나뿐이다.
export const STATIC_DEEP_LINK_ROUTES = {
  settings: { appPaths: ['settings'], to: '/(tabs)/menu-5' },
} as const satisfies Record<string, StaticRoute>;

// ─── EXTERNAL WEB PAGE ─────────────────────────────────────────────────

// TODO(앱): 패턴을 채우기 전에 `app/external-web.tsx` 를 먼저 만든다 — 템플릿에 없어서
// 있는 척하면 +not-found 로 떨어진다 (KR 예: /^about$/, /^cc\/.+$/).
export const EXTERNAL_WEB_PAGE_PATTERNS: readonly RegExp[] = [];

// ─── DYNAMIC ───────────────────────────────────────────────────────────

export type DynamicRouteSpec = {
  /** `:` = named param, 선행 슬래시 없음. */
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

// TODO(앱): 동적 세그먼트가 있으면 `navigate` 를 직접 주는 편이 안전하다 — 이유와 KR 레시피는
// `docs/routing.md`.
export const DYNAMIC_ROUTES_SPEC = {
  menu4Detail: {
    appPattern: 'menu-4/:id',
    toExpoPath: ({ id }, query) => {
      const search = new URLSearchParams(query).toString();
      return search ? `/(tabs)/menu-4/${id}?${search}` : `/(tabs)/menu-4/${id}`;
    },
  },
} as const satisfies Record<string, DynamicRouteSpec>;

export const DEEP_LINK_FALLBACK_ROUTE = '/' as const;
