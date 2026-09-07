/**
 * 푸시(FCM/notify-kit) payload 에서 딥링크 url 을 꺼낸다 (KR `lib/deep-link/extractors.ts` 이식).
 *
 * 순수 함수만 둔다 — 푸시 계층 ↔ 딥링크 계층의 순환 의존을 끊기 위한 분리다.
 * 키 목록은 `constants/push` 하나에서 온다(푸시 계약과 두 벌이 되지 않게).
 */

import { PUSH_DEEP_LINK_DATA_KEYS } from '@/constants/push';

const URL_KEYS = PUSH_DEEP_LINK_DATA_KEYS;

type DataLike = Record<string, unknown> | null | undefined;

/** 서버가 보낸 값이라 타입을 믿지 않는다 (RNFB 는 `string | object`) — 비어있지 않은 문자열만. */
function extractFromData(data: DataLike): string | null {
  if (!data) return null;
  for (const key of URL_KEYS) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

/** notify-kit 이벤트 detail 에서 url 추출. */
export function extractFromNotifeeDetail(detail: {
  notification?: { data?: DataLike };
}): string | null {
  return extractFromData(detail?.notification?.data);
}

/** RemoteMessage(RNFB) 에서 url 추출. */
export function extractFromRemoteMessage(remoteMessage: { data?: DataLike }): string | null {
  return extractFromData(remoteMessage?.data);
}
