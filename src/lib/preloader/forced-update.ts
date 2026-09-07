import type { PreloaderCallbacks } from './types';

import { Platform } from 'react-native';

import semver from 'semver';
import { Env } from '@env';
import { getAppForceUpdate } from '@/api/app/requests';

// 강제 업데이트 체크. 서버 minVersion < 현재 버전이면 콜백으로 팝업을 띄우고,
// 'update' 선택 시 resolve하지 않는 Promise로 스플래시에 머물러 홈 진입 차단.
export async function runForcedUpdateStage(
  onForcedUpdate?: PreloaderCallbacks['onForcedUpdate']
): Promise<void> {
  const current = Env.version.app;

  const response = await getAppForceUpdate().catch(error => {
    console.warn('[Preloader/forced-update] fetch failed:', error?.message);
    return null;
  });

  const data = response?.payload;
  if (!data) {
    console.log('[Preloader/forced-update] no data, skip');
    return;
  }

  const minVersion =
    typeof data.minVersion === 'string'
      ? data.minVersion
      : Platform.OS === 'ios'
        ? data.minVersion.ios
        : data.minVersion.android;
  const storeUrl = Platform.OS === 'ios' ? data.storeUrl.ios : data.storeUrl.android;

  if (!semver.valid(current) || !semver.valid(minVersion)) {
    console.warn('[Preloader/forced-update] invalid version, skip', {
      current,
      minVersion,
    });
    return;
  }

  const outdated = semver.lt(current, minVersion);

  console.log('[Preloader/forced-update] check', {
    current,
    minVersion,
    outdated,
    storeUrl,
  });

  if (!outdated) return;
  if (!storeUrl) {
    console.warn('[Preloader/forced-update] outdated but store URL missing, skip blocking');
    return;
  }
  if (!onForcedUpdate) return;

  const choice = await onForcedUpdate({ storeUrl });

  if (choice === 'update') {
    await new Promise<never>(() => {});
  }
}
