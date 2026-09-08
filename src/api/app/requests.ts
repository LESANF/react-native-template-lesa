import type { AppForceUpdateResponse } from './types';

/**
 * 강제 업데이트 정책. null 이면 프리로더가 스킵한다.
 * TODO(앱): `client.get<AppForceUpdateResponse>('/v2/app/force-update', { auth: 'none' })`.
 */
export function getAppForceUpdate(): Promise<AppForceUpdateResponse | null> {
  return Promise.resolve(null);
}
