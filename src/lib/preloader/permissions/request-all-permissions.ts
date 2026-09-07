import type { AppPermission, PlatformPermission } from './types';
import { DEFAULT_PERMISSION_CONFIG } from './config';
import { requestPermission } from './request-permission';

export async function requestAllPermissions(
  override?: Partial<Record<AppPermission, PlatformPermission>>
): Promise<Record<AppPermission, boolean>> {
  const mergedConfig: Partial<Record<AppPermission, PlatformPermission>> = {
    ...DEFAULT_PERMISSION_CONFIG,
    ...(override ?? {}),
  };

  const results: Record<AppPermission, boolean> = {
    notifications: false,
  };

  const entries = Object.entries(mergedConfig) as [AppPermission, PlatformPermission][];

  for (const [permissionKey, platformPermission] of entries) {
    try {
      const { granted } = await requestPermission(platformPermission);
      results[permissionKey] = granted;
    } catch {
      results[permissionKey] = false;
    }
  }

  console.log('[Preloader/permissions] results:', results);
  return results;
}
