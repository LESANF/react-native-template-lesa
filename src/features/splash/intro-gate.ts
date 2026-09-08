import { useMemo } from 'react';

import type { ReactNode } from 'react';

/**
 * 프리로더 뒤 splash 가 기다릴 것. 기본은 최소 노출 시간.
 * TODO(앱): 인트로 영상은 `useSplashIntro` 만 교체 — `docs/boot.md`.
 */
export const SPLASH_INTRO_MIN_MS = 1000;

export type SplashIntro = {
  /** 끝나면 onDone 1회. 반환값은 cleanup. */
  readonly start: (onDone: () => void) => () => void;
  /** 로고 위에 얹을 UI. */
  readonly node: ReactNode;
};

/** 최소 노출 시간 보장 — 빠른 부팅에서 깜빡이지 않게. */
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
