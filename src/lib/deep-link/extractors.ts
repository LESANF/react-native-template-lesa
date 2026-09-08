/** 푸시 payload → 딥링크 url. 순수 함수만 — 푸시↔딥링크 순환 의존을 끊는다. */

import { PUSH_DEEP_LINK_DATA_KEYS } from '@/constants/push';

const URL_KEYS = PUSH_DEEP_LINK_DATA_KEYS;

type DataLike = Record<string, unknown> | null | undefined;

/** RNFB 는 `string | object` — 비어있지 않은 문자열만 받는다. */
function extractFromData(data: DataLike): string | null {
  if (!data) return null;
  for (const key of URL_KEYS) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

export function extractFromNotifeeDetail(detail: {
  notification?: { data?: DataLike };
}): string | null {
  return extractFromData(detail?.notification?.data);
}

export function extractFromRemoteMessage(remoteMessage: { data?: DataLike }): string | null {
  return extractFromData(remoteMessage?.data);
}
