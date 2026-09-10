import type { Permission as NativePermission, NotificationOption } from 'react-native-permissions';

/**
 * 확장되는 권한은 아래 타입에 추가한다
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
