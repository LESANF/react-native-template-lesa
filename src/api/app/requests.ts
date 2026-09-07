import type { AppForceUpdateResponse } from './types';

/**
 * 강제 업데이트 정책.
 *
 * TODO(앱): 서버 API로 교체한다. 그때까지 null 이라 프리로더의 forced-update 스테이지는
 * "no data, skip" 으로 지나간다(부팅을 막지 않는다).
 *
 * 실제 요청:
 *   return client.get<AppForceUpdateResponse>('/v2/app/force-update', { auth: 'none' });
 */
export function getAppForceUpdate(): Promise<AppForceUpdateResponse | null> {
  return Promise.resolve(null);
}
