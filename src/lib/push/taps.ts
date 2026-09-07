/**
 * 푸시 탭 → 딥링크. React 계층에서 배선한다(`hooks/use-deep-link`).
 *
 *   background/killed : OS 가 그림 → 탭은 RNFB 로
 *   foreground        : OS 가 안 그림 → 우리가 그리면 탭은 notifee 로
 *
 * 표시 주체가 상태별로 갈려 중복이 없다. 자세한 것은 `docs/push.md`.
 */

import {
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import notifee, { AndroidStyle, EventType } from 'react-native-notify-kit';

import { PUSH_CHANNEL_ID, SHOW_FOREGROUND_NOTIFICATION } from '@/constants/push';
import { extractFromNotifeeDetail, extractFromRemoteMessage } from '@/lib/deep-link/extractors';

import { ensurePushChannel, enqueuePushTap, getPushMessaging, isPushConfigured } from './core';

/** RNFB 26 은 RemoteMessage 를 re-export 하지 않는다 — 공개 시그니처에서 파생. */
type PushRemoteMessage = Parameters<Parameters<typeof onMessage>[1]>[0];

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

/** 포그라운드 배너(KR 이식). data-only 메시지는 그릴 게 없어 건너뛴다. */
async function displayForegroundNotification(message: PushRemoteMessage): Promise<void> {
  const { data, notification } = message;
  if (!notification) return;

  // 이미지 위치가 플랫폼마다 다르다 — Android 는 notification.android.imageUrl, iOS 는 data.fcm_options.image.
  const fcmOptionsImage = (data as { fcm_options?: { image?: string } } | undefined)?.fcm_options
    ?.image;
  const imageUrl = notification.android?.imageUrl ?? fcmOptionsImage;

  await notifee.displayNotification({
    id: message.messageId,
    title: notification.title || '',
    body: notification.body || '',
    data: { ...data, messageId: message.messageId ?? '' } as Record<string, string>,
    android: {
      channelId: PUSH_CHANNEL_ID,
      // TODO(앱): 전용 small icon 리소스(단색 실루엣). 없으면 런처 아이콘이 흰 사각형으로 보인다.
      smallIcon: 'ic_launcher',
      ...(imageUrl
        ? {
            largeIcon: imageUrl,
            style: { type: AndroidStyle.BIGPICTURE, picture: imageUrl, largeIcon: imageUrl },
          }
        : {}),
      pressAction: { id: 'default' },
    },
    ios: {
      sound: 'default',
      ...(imageUrl ? { attachments: [{ url: imageUrl, thumbnailHidden: false }] } : {}),
      foregroundPresentationOptions: { badge: true, banner: true, list: true, sound: true },
    },
  });
}

/** 앱이 살아 있는 동안의 수신·탭 구독. cleanup 은 useDeepLink 의 effect 가 호출한다. */
export function subscribePush(): () => void {
  const unsubscribes: (() => void)[] = [];

  if (isPushConfigured) {
    const messaging = getPushMessaging();

    // foreground 수신: OS 가 배너를 그리지 않으므로, 그릴지 말지는 우리 정책이다.
    unsubscribes.push(
      onMessage(messaging, async message => {
        // TODO(앱): 알림 배지·목록 쿼리 invalidate (KR 은 여기서 배지/카테고리/목록 3개를 갱신한다).
        if (!SHOW_FOREGROUND_NOTIFICATION) return;
        await ensurePushChannel();
        await displayForegroundNotification(message);
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
