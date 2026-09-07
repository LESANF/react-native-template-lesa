/**
 * 푸시 headless 계층 — 루트 `index.js` 가 `expo-router/entry` **앞에서** import 한다.
 *
 * OS 가 앱이 죽은 상태에서 JS 를 깨울 때 React 트리는 없다. 그래서 이 파일은 모듈 스코프에서만
 * 동작하고 React · navigation · 화면 컴포넌트를 import 하지 않는다. dispatcher → matcher → gates →
 * auth-store(MMKV 동기) 체인은 KR 과 같이 허용된다 — 스토어는 React 없이 읽을 수 있다.
 * 탭 결과는 `deepLinkDispatcher` 큐에 쌓였다가 splash 가 닫힌 뒤 소비된다.
 */

import { setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType } from 'react-native-notify-kit';

import { extractFromNotifeeDetail } from '@/lib/deep-link/extractors';

import { ensurePushChannel, enqueuePushTap, getPushMessaging, isPushConfigured } from './core';

import type { FcmRemoteMessage } from 'react-native-notify-kit';

if (isPushConfigured) {
  // Android data-only / iOS silent 로 도착한 메시지를 notify-kit 이 그린다(FCM Mode).
  // 채널이 아직 없을 수 있는 첫 푸시를 위해 표시 직전에 await 한다 — 메모이즈라 두 번째부터는 즉시 통과.
  setBackgroundMessageHandler(getPushMessaging(), async (message) => {
    await ensurePushChannel();
    // RNFB 의 data 는 Record<string, string | object>, notify-kit 은 Record<string, string> — 읽는 필드는 같다.
    await notifee.handleFcmMessage(message as unknown as FcmRemoteMessage);
  });
} else {
  console.log('[push] disabled — Firebase 미구성(getApps()=0)');
}

// 표시 계층의 탭은 Firebase 유무와 무관하게 살아 있어야 한다(로컬 알림도 여기로 온다).
// onBackgroundEvent 는 프로세스당 1회, 모듈 스코프에서만 등록할 수 있다.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) enqueuePushTap(extractFromNotifeeDetail(detail), 'background');
});

// 첫 푸시가 fallback 채널로 떨어지지 않게 부팅 즉시 시작한다(결과는 위 핸들러들이 await 한다).
void ensurePushChannel();
