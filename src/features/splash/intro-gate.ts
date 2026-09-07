import { useMemo } from 'react';

import type { ReactNode } from 'react';

/**
 * 인트로 게이트 — 프리로더가 끝난 뒤 splash 가 "무엇을 기다릴지"를 한 곳에 모은다.
 *
 * 참조 앱(KR)은 이 자리가 인트로 영상이었다(`app/splash.tsx`): `Asset.loadAsync(video)` → `player.play()`
 * → `playToEnd` / 재생 에러 / Skip 탭에서 `goToTabs()`. 즉 "영상"이 아니라 "끝나면 이동하는 게이트"가 본질이라,
 * 템플릿은 게이트만 남기고 기본 구현을 최소 노출 시간으로 둔다. OTA 진행 중(isOtaPending)엔 KR 처럼 게이트를 건너뛴다.
 *
 * TODO(앱): 영상을 넣을 땐 `useSplashIntro` 하나만 바꾼다 —
 *   start(onDone): Asset.loadAsync(intro) → setShowVideo → player.play(); player.addListener('playToEnd', onDone);
 *                  statusChange(error) → onDone; cleanup = 리스너 제거 + player.pause()/release()(KR resetSplashPlayer/releaseSplashPlayer)
 *   node:          <VideoView player nativeControls={false} contentFit="cover" /> + Skip Pressable(onDone)
 */
export const SPLASH_INTRO_MIN_MS = 1000;

export type SplashIntro = {
  /** 프리로더 완료 후 splash 가 호출한다. 끝나면 onDone 을 한 번 부른다. 반환값은 unmount 시 cleanup. */
  readonly start: (onDone: () => void) => () => void;
  /** 로고 위에 얹을 UI(영상 뷰·Skip 등). 기본 구현은 없음. */
  readonly node: ReactNode;
};

/** 기본 게이트: 최소 노출 시간만 보장한다(새로고침·빠른 부팅에서 splash 가 깜빡이고 사라지지 않게). */
export function createMinTimeIntro(ms: number = SPLASH_INTRO_MIN_MS): SplashIntro {
  return {
    start: (onDone) => {
      const timer = setTimeout(onDone, ms);
      return () => clearTimeout(timer);
    },
    node: null,
  };
}

export function useSplashIntro(): SplashIntro {
  return useMemo(() => createMinTimeIntro(), []);
}
