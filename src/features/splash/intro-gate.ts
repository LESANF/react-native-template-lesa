import { useMemo } from 'react';

import type { ReactNode } from 'react';

/**
 * 프리로더 뒤 splash 가 "무엇을 기다릴지". 기본은 최소 노출 시간이다.
 * TODO(앱): 인트로 영상을 넣을 땐 `useSplashIntro` 하나만 바꾼다 — 레시피는 `docs/boot.md`.
 */
export const SPLASH_INTRO_MIN_MS = 1000;

export type SplashIntro = {
  /** 끝나면 onDone 을 한 번 부른다. 반환값은 unmount 시 cleanup. */
  readonly start: (onDone: () => void) => () => void;
  /** 로고 위에 얹을 UI. 기본 구현은 없다. */
  readonly node: ReactNode;
};

/** 최소 노출 시간만 보장한다 — 빠른 부팅에서 splash 가 깜빡이지 않게. */
export function createMinTimeIntro(ms: number = SPLASH_INTRO_MIN_MS): SplashIntro {
  return {
    start: onDone => {
      const timer = setTimeout(onDone, ms);
      return () => clearTimeout(timer);
    },
    node: null,
  };
}

export function useSplashIntro(): SplashIntro {
  return useMemo(() => createMinTimeIntro(), []);
}
