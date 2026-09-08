/**
 * 어트리뷰션 SDK(선택) — 채우면 붙고 비우면 떨어진다. SDK import 는 여기에만.
 * 붙일 때 손대는 4곳은 `docs/boot.md`.
 */

export type AttributionAdapter = {
  /** SDK 콜백 → onUrl. 반환값은 cleanup. */
  subscribeDeepLink?: (onUrl: (url: string) => void) => (() => void) | void;
};

// TODO(앱): 예) subscribeDeepLink: onUrl => { Airbridge.setOnDeeplinkReceived(onUrl); }
export const attributionAdapter: AttributionAdapter = {};
