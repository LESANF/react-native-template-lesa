import type { AppPermission } from './permissions/types';

import { STAGES } from '@/constants/preloader';

export type PreloaderStage = (typeof STAGES)[number];

// 강제 업데이트 / OTA
export type ForcedUpdateChoice = 'update' | 'dismiss';
export type ForcedUpdatePayload = {
  storeUrl: string;
};
export type OtaUpdateChoice = 'now' | 'later';
export type OtaUpdatePayload = {
  message: string | null;
  download: () => Promise<boolean>;
};

// 실패 격리
export type StageFailure = {
  stage: PreloaderStage;
  error: unknown;
};

// 콜백이 undefined면 해당 단계는 skip — "주입 = 활성화" 규칙.
export type PreloaderCallbacks = {
  onProgress?: (stage: PreloaderStage, current: number, total: number) => void;
  onStageError?: (failure: StageFailure) => void;
  onForcedUpdate?: (payload: ForcedUpdatePayload) => Promise<ForcedUpdateChoice>;
  onOtaUpdate?: (payload: OtaUpdatePayload) => Promise<OtaUpdateChoice>;
  onPermissions?: () => Promise<Record<AppPermission, boolean>>;
};

export type PreloaderResult = {
  failures: StageFailure[];
};
