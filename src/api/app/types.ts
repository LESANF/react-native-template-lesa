export type AppForceUpdateVersion = {
  readonly ios: string;
  readonly android: string;
};

export type AppForceUpdateStoreUrl = {
  readonly ios: string;
  readonly android: string;
};

export type AppForceUpdatePayload = {
  /** 플랫폼 공통이면 문자열, 다르면 { ios, android }. semver 문자열. */
  readonly minVersion: string | AppForceUpdateVersion;
  readonly storeUrl: AppForceUpdateStoreUrl;
};

export type AppForceUpdateResponse = {
  readonly payload: AppForceUpdatePayload | null;
};
