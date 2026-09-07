/**
 * 진입 source. 어디로 들어오든 최종 목적지는 dispatcher.enqueue 하나다.
 *
 *   OS Linking : cold(getInitialURL) + background(url 이벤트)
 *   in-app     : emitInApp — 인앱 배너/버튼이 같은 라우팅 규칙을 타게 한다
 */

import { Linking } from 'react-native';

import { deepLinkDispatcher } from './dispatcher';

/**
 * cold 1회 처리 플래그.
 * JS 리로드 후에도 native 의 getInitialURL 캐시는 그대로라 중복 enqueue 가 가능하다
 * (dev 리로드 한정, prod 영향 없음).
 */
let hasHandledLinkingColdStart = false;

export async function captureLinkingColdStart(): Promise<void> {
  if (hasHandledLinkingColdStart) return;
  try {
    const url = await Linking.getInitialURL();
    hasHandledLinkingColdStart = true;
    if (url) deepLinkDispatcher.enqueue(url, 'cold');
  } catch (error) {
    console.error('[deep-link] cold start capture 실패', error);
  }
}

export function subscribeLinking(): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    deepLinkDispatcher.enqueue(url, 'background');
  });
  return () => subscription.remove();
}

/** 예: emitInApp(`${Env.identity.scheme}://menu-4/42`) */
export function emitInApp(url: string) {
  deepLinkDispatcher.enqueue(url, 'in-app');
}

/*
 * 푸시 알림 탭은 이 파일을 거치지 않는다 — `lib/push/background.ts`(headless, 루트 index.js)와
 * `lib/push/taps.ts`(React 계층)가 `deepLinkDispatcher.enqueue` 로 직접 합류한다.
 * 같은 링크가 두 경로(RNFB + notifee)로 들어와도 dispatcher 의 2초 중복 제거가 걸러낸다.
 */
