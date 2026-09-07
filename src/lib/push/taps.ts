/**
 * 푸시 탭 → 딥링크. React 계층에서 배선한다(`hooks/use-deep-link`).
 *
 * 상태별로 어느 SDK 가 탭을 알려주는지가 다르다 — 누락 없이 덮으려면 둘 다 구독해야 한다.
 *   iOS foreground   : notifee(onForegroundEvent) 만
 *   iOS bg/killed    : OS 가 표시 → RNFB 와 notifee 가 **둘 다** 발화 (같은 URL → dispatcher 가 중복 제거)
 *   Android          : notifee 만 (FCM SDK 가 직접 그린 plain 알림만 RNFB 로 온다)
 */

import {
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import notifee, { EventType } from 'react-native-notify-kit';

import { extractFromNotifeeDetail, extractFromRemoteMessage } from '@/lib/deep-link/extractors';

import { ensurePushChannel, enqueuePushTap, getPushMessaging, isPushConfigured } from './core';

import type { FcmRemoteMessage } from 'react-native-notify-kit';

/**
 * cold 1회 처리 플래그 — `captureLinkingColdStart` 와 같은 이유다.
 * JS 리로드 후에도 네이티브의 initial notification 은 그대로라 중복 enqueue 가 가능하다.
 */
let hasHandledPushColdStart = false;

/** 앱이 종료된 상태에서 알림 탭으로 켜진 경우. 큐에 'cold' 로 들어가 splash 종료까지 홀드된다. */
export async function capturePushColdStart(): Promise<void> {
  if (hasHandledPushColdStart) return;
  hasHandledPushColdStart = true;

  if (isPushConfigured) {
    try {
      const message = await getInitialNotification(getPushMessaging());
      if (message) enqueuePushTap(extractFromRemoteMessage(message), 'cold');
    } catch (error) {
      console.log('[push] RNFB cold start capture 실패', error);
    }
  }

  // notify-kit 이 그린 알림(로컬 포함)은 Firebase 유무와 무관하게 여기로 온다.
  try {
    const initial = await notifee.getInitialNotification();
    if (initial) enqueuePushTap(extractFromNotifeeDetail(initial), 'cold');
  } catch (error) {
    console.log('[push] notifee cold start capture 실패', error);
  }
}

/** 앱이 살아 있는 동안의 수신·탭 구독. cleanup 은 useDeepLink 의 effect 가 호출한다. */
export function subscribePush(): () => void {
  const unsubscribes: (() => void)[] = [];

  if (isPushConfigured) {
    const messaging = getPushMessaging();

    // foreground 수신: OS 는 배너를 그리지 않는다 → notify-kit 이 그린다(FCM Mode).
    unsubscribes.push(
      onMessage(messaging, async message => {
        await ensurePushChannel();
        await notifee.handleFcmMessage(message as unknown as FcmRemoteMessage);
      })
    );

    // OS 알림 탭으로 백그라운드 → 포그라운드 복귀. iOS 에서는 notifee 이벤트와 겹치지만 dispatcher 가 걸러낸다.
    unsubscribes.push(
      onNotificationOpenedApp(messaging, message =>
        enqueuePushTap(extractFromRemoteMessage(message), 'background')
      )
    );
  }

  unsubscribes.push(
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS)
        enqueuePushTap(extractFromNotifeeDetail(detail), 'foreground-tap');
    })
  );

  // TODO(앱): 배지 리셋 정책(포그라운드 복귀 시 notifee.setBadgeCount(0) 등)
  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
  };
}
