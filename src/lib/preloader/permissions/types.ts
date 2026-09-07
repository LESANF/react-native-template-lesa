import type { Permission as NativePermission, NotificationOption } from 'react-native-permissions';

/**
 * 확장 되는 권한 아래 타입 추가
 */
export type AppPermission = 'notifications';

export type PlatformPermission =
  | {
      type: 'native';
      ios?: NativePermission;
      android?: NativePermission;
    }
  | {
      type: 'notification';
      options?: NotificationOption[];
    };

export type PermissionResult = {
  granted: boolean;
  shouldGuide: boolean;
};
