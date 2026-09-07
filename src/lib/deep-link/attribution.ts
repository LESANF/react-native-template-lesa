/**
 * 어트리뷰션 SDK(선택) — 이 파일만 채우면 붙고 비우면 떨어진다.
 * SDK import 가 여기에만 있어 미설치여도 빌드가 깨지지 않는다.
 * 붙일 때 손대는 4곳은 `docs/boot.md` "어트리뷰션 SDK".
 */

export type AttributionAdapter = {
  /** SDK 딥링크 콜백 → onUrl. cleanup 을 돌려주면 언마운트 시 호출된다. */
  subscribeDeepLink?: (onUrl: (url: string) => void) => (() => void) | void;
};

// TODO(앱): 예) subscribeDeepLink: onUrl => { Airbridge.setOnDeeplinkReceived(onUrl); }
export const attributionAdapter: AttributionAdapter = {};
