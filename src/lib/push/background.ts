/**
 * 푸시 headless — `index.js` 가 `expo-router/entry` 앞에서 import 한다.
 * 앱이 죽은 채 OS 가 JS 를 깨우므로 React·화면을 import 하면 안 된다(스토어는 허용).
 * 표시는 OS 가 하고 여기는 데이터 부수효과만 맡는다 — `docs/push.md`.
 */

import { setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType } from 'react-native-notify-kit';

import { extractFromNotifeeDetail } from '@/lib/deep-link/extractors';

import { ensurePushChannel, enqueuePushTap, getPushMessaging, isPushConfigured } from './core';

if (isPushConfigured) {
  setBackgroundMessageHandler(getPushMessaging(), async remoteMessage => {
    // TODO(앱): 배지 저장·캐시 갱신 등. 표시는 OS 가 하므로 여기서 그리지 않는다.
    console.log('[push] background message', remoteMessage.messageId);
  });
} else {
  console.log('[push] disabled — Firebase 미구성(getApps()=0)');
}

/**
 * 우리가 그린 알림(로컬·포그라운드 배너)의 탭. notify-kit 의 background 는
 * "백그라운드 또는 종료" 둘 다다. 프로세스당 1회, 모듈 스코프에서만 등록된다.
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) enqueuePushTap(extractFromNotifeeDetail(detail), 'background');
});

// 첫 알림이 fallback 채널로 떨어지지 않게 부팅 즉시 시작한다.
void ensurePushChannel();
