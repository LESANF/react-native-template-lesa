/**
 * 딥링크 라우팅의 single source of truth (KR `constants/deep-link.ts` 이식).
 *
 * 흐름: 푸시/Linking url → parser → matcher (DYNAMIC queryDriven → STATIC → EXTERNAL_WEB → DYNAMIC)
 *       → gates → navigate. 본 모듈은 **spec 테이블만** 들고, 매칭 로직은 `lib/deep-link/matcher.ts`.
 *
 * 이 파일은 `app.config.ts` 가 import 한다(유니버설 링크 네이티브 설정 파생).
 * 따라서 **런타임 import 는 넣지 않는다** — 타입 전용 import 만 허용된다(트랜스파일에서 지워진다).
 */

import type { EntrySource, GateName, NavigateContext, ParsedDeepLink } from '@/lib/deep-link/types';

/**
 * 유니버설 링크(https) 호스트 화이트리스트.
 * 비어 있으면 https 링크는 전부 `unknown` 으로 떨어져 noop — 앱 스킴만 동작한다.
 */
export const DEEP_LINK_HTTPS_HOSTS: readonly string[] = [
  // TODO(앱): 유니버설 링크 호스트 (예: 'www.example.com')
  // 어트리뷰션 SDK 를 붙였다면 그 링크 도메인도 여기 넣는다 — iOS associatedDomains ·
  // Android intentFilters · +native-intent 인식이 전부 이 한 곳에서 파생된다.
  // (KR = Airbridge: `<app>.airbridge.io` · `<app>.abr.ge` · 커스텀 도메인 3개.
  //  KR 은 이 목록을 app.config 와 +native-intent 두 곳에 중복으로 갖고 있다 — 여기선 하나다.)
];

/**
 * cold 진입에서 +native-intent 가 돌려주는 경로.
 * 실제 이동은 splash 가 닫힌 뒤 dispatcher 가 결정하므로, 여기서는 화면을 "붙잡아" 두기만 한다.
 */
export const SAFE_REDIRECT_PATH = '/splash';

/** 매칭 실패 / 게이트 미통과 시 최종 착지점. +not-found 로 빠지는 것보다 낫다. */
export const SAFE_FALLBACK_PATH = '/(tabs)';

/**
 * 같은 링크가 여러 source(OS Linking + 푸시 등)로 동시에 들어올 때의 중복 판정 창.
 *
 * 어트리뷰션 SDK 와 커플링된다 — SDK 가 링크를 OS Linking 으로 **재전파하도록** 설정하면
 * 전달 경로가 둘이 되고, SDK 는 보통 자기 서버를 왕복하므로 그 간격이 2초를 넘겨 같은 화면으로
 * 두 번 이동할 수 있다. KR 이 이 값으로 문제없이 도는 이유는 재전파를 껐기 때문이다
 * (`iosPropagateDeeplink: false`). 전파를 켜야 한다면 이 값을 함께 올린다.
 * 자세한 것은 `lib/deep-link/attribution.ts`.
 */
export const HANDLED_TTL_MS = 2000;

/** 처리 이력 맵 상한 — 넘으면 만료분부터 청소한다. */
export const HANDLED_MAX = 50;

/** splash → dispatcher 핸드오프 지연. router.replace 와 dispatcher 의 reset 충돌 방지. */
export const SPLASH_HANDOFF_DELAY_MS = 100;

/**
 * auth 게이트가 여는 로그인 화면.
 * TODO(앱): 이 라우트는 템플릿에 **아직 없다** — 로그인 화면을 만들고 경로를 맞춰야 게이트가 동작한다
 *           (KR: `/auth/login` 모달). 없는 상태로 게이트가 발동하면 +not-found 로 떨어진다.
 */
export const AUTH_LOGIN_PATH = '/auth/login';

/**
 * 로그인 화면이 속한 라우트 그룹의 첫 세그먼트 — deferred 재생이 "모달이 닫혔는지" 판단하는 기준.
 * TODO(앱): AUTH_LOGIN_PATH 와 함께 프로젝트 라우트 구조에 맞춘다.
 */
export const AUTH_ROUTE_GROUP = 'auth';

// ─── STATIC ────────────────────────────────────────────────────────────

export type StaticResetTopRoute =
  | string
  | {
      name: string;
      params?: Record<string, unknown>;
      nested?: StaticResetTopRoute extends infer T ? (T extends string ? never : T[]) : never;
    };

/**
 *   tab        활성 base 탭
 *   stack      탭 내부 stack
 *   topRoute   (tabs) 위에 쌓을 root-level 라우트
 */
export type StaticResetSpec = {
  tab: string;
  stack: readonly (string | { name: string; params?: Record<string, unknown> })[];
  topRoute?: StaticResetTopRoute;
};

/**
 *   appPaths           app-scheme 매칭 path (선행 슬래시 없음 — parser 가 그렇게 정규화한다)
 *   webPaths           web-link 매칭 path (parser alias 적용 후)
 *   to                 Expo Router 라우트 (reset 미지정 시 inferResetFromTo 또는 navigate)
 *   reset              명시적 stack 합성 (미지정 시 to 에서 자동 추론)
 *   gates              통과 게이트
 *   whenAuthenticated  인증 시 redirect (KR 예: authRegister → mypage)
 */
export type StaticRoute = {
  appPaths: readonly string[];
  webPaths?: readonly string[];
  to: string;
  reset?: StaticResetSpec;
  gates?: readonly GateName[];
  whenAuthenticated?: { to: string; reset: StaticResetSpec };
};

/**
 * 정확 매칭 STATIC 라우트. 외부 마케팅 페이지는 EXTERNAL_WEB_PAGE_PATTERNS 로 간다.
 *
 * TODO(앱): 앱의 링크 스펙을 여기에 한 줄씩 채운다. 아래는 예제 하나뿐이다.
 *   - 웹 URL 과 앱 경로가 다르면 `webPaths` (또는 parser 의 alias) 로 흡수한다.
 *   - 로그인이 필요하면 `gates: ['auth']`, 인증 상태에서 다른 화면으로 보내려면 `whenAuthenticated`.
 *   - `to` 만으로 뒤로가기 스택이 안 나오면 `reset` 을 명시한다(폴더+index 라우트 등 등록명이 다를 때).
 */
export const STATIC_DEEP_LINK_ROUTES = {
  // 예제 — myapp://settings → /(tabs)/menu-5 (탭 자체가 목적지라 reset 추론으로 충분)
  settings: { appPaths: ['settings'], to: '/(tabs)/menu-5' },
} as const satisfies Record<string, StaticRoute>;

// ─── EXTERNAL WEB PAGE ─────────────────────────────────────────────────

/**
 * 우리 웹 도메인의 외부(마케팅) 정적 페이지 — 앱 안에서 단순 웹뷰로 띄운다. 토큰/브릿지 없음.
 * 매칭되면 matcher 가 `/external-web?path=/<path>` 핸들러를 만든다.
 *
 * TODO(앱): 패턴을 채우기 전에 `app/external-web.tsx` 라우트를 먼저 만들어야 한다 —
 *           템플릿에는 없다(있는 척하면 +not-found 로 떨어진다). KR 예: /^about$/, /^cc\/.+$/
 */
export const EXTERNAL_WEB_PAGE_PATTERNS: readonly RegExp[] = [];

// ─── DYNAMIC ───────────────────────────────────────────────────────────

/**
 *   appPattern            'menu-4/:id' 같은 패턴 (':' = named param, 선행 슬래시 없음)
 *   queryDriven           query 기반 매칭. string 단일 또는 readonly string[] (배열은 OR)
 *   toExpoPath            matched params + query → expo-router path (native-intent + handler 공통)
 *   gates                 통과 게이트
 *   safeFallbackExpoPath  게이트/비동기 처리가 끝나기 전 사용자가 볼 화면 (KR 은 raffle 핸들러 안에 뒀다)
 *   navigate              이동 자체를 앱이 가져갈 때 (KR 핸들러를 1:1 로 옮기는 자리 — 아래 레시피 참고)
 */
export type DynamicRouteSpec = {
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

/**
 * 패턴 매칭 DYNAMIC 라우트.
 *
 * TODO(앱): 동적 세그먼트가 있는 라우트는 `navigate` 를 직접 주는 편이 안전하다.
 *           기본 이동은 `toExpoPath` 결과에서 reset 을 추론하는데, 파일 기반 등록명(`[id]`)과
 *           URL 값(`42`)이 달라 external(cold/background/overlay-tap) 진입에서 미매치할 수 있다.
 *           KR 은 라우트마다 명시 reset 을 썼다:
 *             navigate: (_parsed, entrySource, ctx, { id }) => {
 *               if (entrySource === 'in-app' || entrySource === 'foreground-tap') {
 *                 ctx.router.push({ pathname: '/(tabs)/menu-4/[id]', params: { id } });
 *                 return;
 *               }
 *               ctx.reset({ tab: 'menu-4', stack: ['index', { name: '[id]', params: { id } }] });
 *             }
 */
export const DYNAMIC_ROUTES_SPEC = {
  // 예제 — myapp://menu-4/42?mode=edit → /(tabs)/menu-4/42?mode=edit
  menu4Detail: {
    appPattern: 'menu-4/:id',
    toExpoPath: ({ id }, query) => {
      const search = new URLSearchParams(query).toString();
      return search ? `/(tabs)/menu-4/${id}?${search}` : `/(tabs)/menu-4/${id}`;
    },
  },
} as const satisfies Record<string, DynamicRouteSpec>;

/** miss fallback. dispatcher 가 noop 처리하므로 거의 쓰이지 않는다. */
export const DEEP_LINK_FALLBACK_ROUTE = '/' as const;
