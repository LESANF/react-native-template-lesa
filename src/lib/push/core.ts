/**
 * 푸시 공통 코어 — 활성화 스위치 · 채널/표시 설정 · payload → 딥링크 합류.
 *
 * headless(entry) 경로와 React 경로가 **같은 함수**를 쓴다. 그래서 여기는
 * React·스토어를 절대 import 하지 않는다(background.ts 가 이 모듈만 보고 동작해야 한다).
 */

import { getApps } from '@react-native-firebase/app';
import { getMessaging } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import notifee, { AndroidImportance } from 'react-native-notify-kit';

import { PUSH_CHANNEL_ID, PUSH_CHANNEL_NAME } from '@/constants/push';
import { deepLinkDispatcher } from '@/lib/deep-link/dispatcher';

import type { EntrySource } from '@/lib/deep-link/types';

/**
 * "주입 = 활성화". firebase/ 설정 파일이 없으면 app.config 가 RNFB 플러그인을 넣지 않고,
 * 그러면 네이티브가 FirebaseApp 을 초기화하지 않아 `getApps()` 가 빈 배열이다.
 * 이 값이 false 인 동안 FCM API 를 부르면 안 된다(iOS nil receiver / Android provider 없음).
 */
export const isPushConfigured = getApps().length > 0;

/** isPushConfigured 가 true 일 때만 호출한다. */
export function getPushMessaging() {
  return getMessaging();
}

let ensureChannelPromise: Promise<void> | null = null;

/**
 * 채널 생성 + notify-kit FCM Mode 기본값 등록. 최초 1회만 실제로 수행하고 이후엔 같은 promise 를 돌려준다.
 *
 * 참조 앱은 채널을 React 마운트 뒤에 만들어서, 앱이 꺼진 채 도착한 **첫 푸시**가 fallback 채널로
 * 떨어졌다(결함 D3). 여기서는 entry 모듈 스코프에서 시작하고, 백그라운드 핸들러·onMessage 진입 시
 * 한 번 더 `await` 한다 — 메모이즈라 비용은 0이다.
 *
 * 절대 reject 하지 않는다. headless 호출자가 죽으면 알림 자체가 사라진다.
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

      // FCM Mode: 서버가 notifee_options 를 안 보내는 구 페이로드(title/body만)도 'display' 로 표시된다.
      await notifee.setFcmConfig({
        defaultChannelId: PUSH_CHANNEL_ID,
        defaultPressAction: { id: 'default', launchActivity: 'default' },
        fallbackBehavior: 'display',
      });
    } catch (error) {
      console.warn('[push] 채널/FCM 설정 실패 — 알림은 기본 채널로 표시된다', error);
    }
  })();

  return ensureChannelPromise;
}

/**
 * 모든 탭 이벤트의 단일 출구 — 딥링크 dispatcher 가 큐·중복 제거·콜드 홀드를 그대로 담당한다.
 *
 * payload → url 추출은 `lib/deep-link/extractors` 가 한다(딥링크 계약이라 그쪽이 소유).
 * 호출부는 `extractFromNotifeeDetail` / `extractFromRemoteMessage` 결과를 그대로 넘긴다.
 */
export function enqueuePushTap(url: string | null, entrySource: EntrySource): void {
  if (!url) return;

  console.log('[push] tap:', { entrySource, url });
  deepLinkDispatcher.enqueue(url, entrySource);
}
