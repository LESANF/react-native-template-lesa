/**
 * 푸시 공통 코어. headless(entry) 와 React 가 같은 함수를 쓰므로
 * **React·스토어를 import 하면 안 된다** — `docs/push.md`.
 */

import { getApps } from '@react-native-firebase/app';
import { getMessaging } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import notifee, { AndroidImportance } from 'react-native-notify-kit';

import { PUSH_CHANNEL_ID, PUSH_CHANNEL_NAME } from '@/constants/push';
import { deepLinkDispatcher } from '@/lib/deep-link/dispatcher';

import type { EntrySource } from '@/lib/deep-link/types';

/** false 인 동안 FCM API 를 부르면 안 된다 — iOS nil receiver · Android provider 없음. */
export const isPushConfigured = getApps().length > 0;

export function getPushMessaging() {
  return getMessaging();
}

let ensureChannelPromise: Promise<void> | null = null;

/**
 * 채널 생성(메모이즈). **entry 모듈 스코프에서 시작해야** 첫 푸시가 fallback 채널로 안 떨어진다.
 * 절대 reject 하지 않는다 — 여기서 throw 하면 알림 자체가 사라진다.
 */
export function ensurePushChannel(): Promise<void> {
  ensureChannelPromise ??= (async () => {
    try {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: PUSH_CHANNEL_ID,
          name: PUSH_CHANNEL_NAME,
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });
      }
    } catch (error) {
      console.warn('[push] 채널 생성 실패 — 알림은 기본 채널로 표시된다', error);
    }
  })();

  return ensureChannelPromise;
}

/** 모든 탭 이벤트의 단일 출구. url 추출은 `lib/deep-link/extractors` 가 소유한다. */
export function enqueuePushTap(url: string | null, entrySource: EntrySource): void {
  if (!url) return;

  console.log('[push] tap:', { entrySource, url });
  deepLinkDispatcher.enqueue(url, entrySource);
}
