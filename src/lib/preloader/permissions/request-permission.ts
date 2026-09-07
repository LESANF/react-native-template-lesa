import type { NotificationOption, PermissionStatus } from 'react-native-permissions';
import type { PermissionResult, PlatformPermission } from './types';

import { Platform } from 'react-native';
import {
  check,
  checkNotifications,
  request,
  requestNotifications,
  RESULTS,
} from 'react-native-permissions';

const PERMISSION_GRANTED: PermissionResult = {
  granted: true,
  shouldGuide: false,
};

const PERMISSION_GUIDE: PermissionResult = {
  granted: false,
  shouldGuide: true,
};

const DEFAULT_NOTIFICATION_OPTIONS: NotificationOption[] = ['alert', 'badge', 'sound'];

type NotificationStatus = PermissionStatus | 'provisional';

function isGranted(status: PermissionStatus): boolean {
  return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
}

function isNotificationGranted(status: NotificationStatus): boolean {
  return status === RESULTS.GRANTED || status === 'provisional';
}

export async function requestPermission(
  platformPermission: PlatformPermission
): Promise<PermissionResult> {
  if (platformPermission.type === 'notification') {
    const options = platformPermission.options ?? DEFAULT_NOTIFICATION_OPTIONS;

    try {
      const { status } = await checkNotifications();
      const currentStatus = status as NotificationStatus;

      if (isNotificationGranted(currentStatus)) {
        return PERMISSION_GRANTED;
      }

      if (currentStatus === RESULTS.DENIED) {
        const { status: requestedStatus } = await requestNotifications(options);

        return isNotificationGranted(requestedStatus as NotificationStatus)
          ? PERMISSION_GRANTED
          : PERMISSION_GUIDE;
      }

      return PERMISSION_GUIDE;
    } catch {
      return PERMISSION_GUIDE;
    }
  }

  const { android, ios } = platformPermission;

  if (Platform.OS === 'android') {
    if (!android) return PERMISSION_GRANTED;

    try {
      const permissionStatus = await check(android);
      if (isGranted(permissionStatus)) return PERMISSION_GRANTED;

      if (permissionStatus === RESULTS.DENIED) {
        const requestedStatus: PermissionStatus = await request(android);
        return isGranted(requestedStatus) ? PERMISSION_GRANTED : PERMISSION_GUIDE;
      }

      return PERMISSION_GUIDE;
    } catch {
      return PERMISSION_GUIDE;
    }
  }

  if (Platform.OS === 'ios') {
    if (!ios) return PERMISSION_GRANTED;

    try {
      const permissionStatus = await check(ios);
      if (isGranted(permissionStatus)) return PERMISSION_GRANTED;

      if (permissionStatus === RESULTS.DENIED) {
        const requestedStatus: PermissionStatus = await request(ios);
        return isGranted(requestedStatus) ? PERMISSION_GRANTED : PERMISSION_GUIDE;
      }

      return PERMISSION_GUIDE;
    } catch {
      return PERMISSION_GUIDE;
    }
  }

  return PERMISSION_GUIDE;
}
