// 딥링크 타입. 각 union 값의 뜻은 `docs/routing.md` "딥링크 런타임".

import type { QueryClient } from '@tanstack/react-query';
import type { ImperativeRouter } from 'expo-router';

import type { useNavigationReset } from '@/hooks/use-navigation-reset';

export type LinkTransport = 'app-scheme' | 'web-link' | 'unknown';

export type EntrySource = 'cold' | 'background' | 'foreground-tap' | 'in-app' | 'overlay-tap';

// TODO(앱): 게이트를 추가하면 union 을 넓힌다. 구현은 `lib/deep-link/gates` 의 GATE_MAP.
export type GateName = 'auth';

/**
 * path 는 선행/후행 슬래시 없이 정규화된다 (예: 'menu-4/42').
 * `segments` 가 원본이고 `path` 는 그것을 이은 것이다 — 디코딩된 세그먼트에 슬래시가
 * 들어 있으면 둘이 어긋날 수 있으니 **매칭은 `segments` 로** 한다.
 */
export type ParsedDeepLink = {
  readonly transport: LinkTransport;
  readonly path: string;
  readonly segments: readonly string[];
  readonly query: Record<string, string>;
  readonly raw: string;
};

export type DeepLinkPayload = {
  readonly parsed: ParsedDeepLink;
  readonly entrySource: EntrySource;
  readonly receivedAt: number;
};

export type NavigateContext = {
  readonly router: ImperativeRouter;
  readonly queryClient: QueryClient;
  readonly reset: ReturnType<typeof useNavigationReset>;
};

/** `expoPath` 는 dispatcher 의 이동과 같은 화면으로 수렴해야 한다 — 어긋나면 +not-found. */
export type RouteHandler = {
  match: (parsed: ParsedDeepLink) => boolean;
  gates: readonly GateName[];
  navigate: (
    parsed: ParsedDeepLink,
    entrySource: EntrySource,
    ctx: NavigateContext
  ) => void | Promise<void>;
  name?: string;
  expoPath: string;
  safeFallbackExpoPath?: string;
};
