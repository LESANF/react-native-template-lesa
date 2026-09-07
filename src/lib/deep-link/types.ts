import type { QueryClient } from '@tanstack/react-query';
import type { ImperativeRouter } from 'expo-router';

import type { useNavigationReset } from '@/hooks/use-navigation-reset';

/**
 * 링크의 운반 수단 — parser 가 판별한다.
 *   app-scheme : myapp://menu-4/42
 *   web-link   : https://<DEEP_LINK_HTTPS_HOSTS 중 하나>/menu-4/42
 *   unknown    : 우리 링크가 아님 (dispatcher noop)
 */
export type LinkTransport = 'app-scheme' | 'web-link' | 'unknown';

/**
 * 진입 시점. cold 만 splash 종료를 기다리고 나머지는 즉시 처리된다.
 *   cold           : 앱 종료 상태에서 OS 가 링크로 실행
 *   background     : 앱이 백그라운드에 있다가 링크로 복귀
 *   foreground-tap : 앱이 떠 있는 상태에서 알림 탭 (푸시 SDK 가 enqueue)
 *   in-app         : 인앱 배너/버튼이 emitInApp 으로 발생시킨 링크
 *   overlay-tap    : (tabs) 밖 root-level 오버레이(예: 알림 목록) 안에서 발생시킨 링크.
 *                    external 과 같은 reset 처리를 받아 뒤로가기 스택이 살아난다.
 */
export type EntrySource = 'cold' | 'background' | 'foreground-tap' | 'in-app' | 'overlay-tap';

/**
 * 진입 게이트 이름. 구현은 lib/deep-link/gates 의 GATE_MAP.
 * TODO(앱): 게이트를 추가하면 union 을 넓힌다 (KR: 'auth' | 'verified' | 'marketing' | 'pushPermission').
 */
export type GateName = 'auth';

/** path 는 선행/후행 슬래시 없이 정규화된다 (예: 'menu-4/42'). segments = path.split('/'). */
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

/** 라우트의 navigate 가 쓰는 도구. useDeepLink 가 1회 bind 한다. reset 은 뒤로가기 스택 합성이 필요할 때. */
export type NavigateContext = {
  readonly router: ImperativeRouter;
  readonly queryClient: QueryClient;
  readonly reset: ReturnType<typeof useNavigationReset>;
};

/**
 * matchRoute 가 돌려주는, 이 링크에 고정된 핸들러.
 *   match                 매칭 검증 (matchRoute 가 이미 확정하므로 현재는 항상 true)
 *   gates                 통과해야 하는 게이트
 *   navigate              실제 진입 (reset / push / navigate)
 *   name                  로깅/디버깅용
 *   expoPath              native-intent 가 돌려줄 경로. dispatcher 의 이동과 같은 화면으로 수렴해야 +not-found 회피
 *   safeFallbackExpoPath  게이트가 있는 라우트의 안전 착지점. splash 가 먼저 이 화면으로 빠져나온 뒤 게이트 UI 가 그 위에 뜬다
 */
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
