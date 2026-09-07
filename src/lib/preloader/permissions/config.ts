import type { AppPermission, PlatformPermission } from './types';

export const DEFAULT_PERMISSION_CONFIG: Partial<Record<AppPermission, PlatformPermission>> = {
  notifications: {
    type: 'notification',
    options: ['alert', 'sound', 'badge'],
  },
};
