/**
 * OS Linking · 인앱 진입 source. 목적지는 `dispatcher.enqueue` 하나다 — `docs/routing.md`.
 * 푸시 알림 탭은 이 파일을 거치지 않고 `lib/push/` 에서 직접 합류한다.
 */

import { Linking } from 'react-native';

import { deepLinkDispatcher } from './dispatcher';

// JS 리로드 후에도 native 의 getInitialURL 캐시는 남아 중복 enqueue 가 된다(dev 한정).
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

export function emitInApp(url: string) {
  deepLinkDispatcher.enqueue(url, 'in-app');
}

