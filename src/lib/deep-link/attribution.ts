/**
 * 어트리뷰션 SDK 이음새 — **선택 사항이며, 이 파일 하나만 채우면 붙고 비우면 떨어진다.**
 *
 * 템플릿 기본값은 빈 객체다(= 미사용). SDK import 가 이 파일에만 있으므로 패키지를 설치하지
 * 않아도 빌드가 깨지지 않고, 떼어낼 때도 템플릿 소유 파일(`hooks/use-deep-link.ts`)을
 * 건드리지 않는다. 푸시의 `pushTokenSyncAdapter` 와 같은 관용구다.
 *
 * ── 붙일 때 손대는 곳 4개 (참조 앱 KR = Airbridge 기준) ──────────────────
 *
 * 1. `app.config.ts` plugins — SDK 의 config plugin. **JS init 호출은 없다**(KR 확인:
 *    `index.js`·`_layout` 어디에도 `Airbridge.init()` 이 없고 플러그인이 네이티브를 다 잡는다).
 *      ['airbridge-expo-sdk', {
 *        appName: <APP_BUILD_ONLY_*>, appToken: <APP_BUILD_ONLY_*>,
 *        customDomains: [<커스텀 링크 도메인>],
 *        iosPropagateDeeplink: false,   // ← 아래 "중복 제거" 주의
 *      }]
 *
 * 2. `constants/deep-link.ts` 의 `DEEP_LINK_HTTPS_HOSTS` — SDK 링크 도메인을 추가한다
 *    (KR: `<app>.airbridge.io` · `<app>.abr.ge` · 커스텀 도메인). 이 한 곳에서
 *    iOS `associatedDomains` · Android `intentFilters` · `+native-intent` 인식이 모두 파생된다.
 *
 * 3. 이 파일 — 아래 `attributionAdapter` 를 채운다.
 *
 * 4. (선택) 이벤트 taxonomy — KR 은 `lib/airbridge/{events,identity,product}.ts` 로
 *    구매·장바구니 등 도메인 이벤트를 감쌌다. 앱 도메인이라 템플릿 범위 밖이다.
 *
 * ── 중복 제거와의 커플링 (모르고 바꾸면 조용히 깨진다) ─────────────────
 *
 * dispatcher 의 `HANDLED_TTL_MS`(2초)는 "같은 링크가 여러 source 로 동시에 들어오는" 창이다.
 * KR 이 그 값으로 문제없이 도는 이유는 **`iosPropagateDeeplink: false`** 라서 SDK 가 링크를
 * OS Linking 으로 재전파하지 않기 때문이다 — 전달 경로가 하나뿐이라 중복 자체가 없다.
 * 이 옵션을 `true` 로 두면 OS Linking 과 SDK 콜백이 같은 링크를 각각 전달하고, SDK 는 보통
 * 자기 서버를 왕복하므로 그 간격이 2초를 넘겨 **같은 화면으로 두 번 이동**할 수 있다.
 * 굳이 전파를 켜야 한다면 `HANDLED_TTL_MS` 를 함께 올린다.
 */

export type AttributionAdapter = {
  /**
   * SDK 의 딥링크 콜백을 구독하고, 받은 URL 을 `onUrl` 로 넘긴다.
   * cleanup 함수를 돌려주면 언마운트 시 호출된다(KR 의 Airbridge 처럼 해제 API 가 없으면 생략).
   *
   * TODO(앱): 예시 —
   *   subscribeDeepLink: onUrl => {
   *     Airbridge.setOnDeeplinkReceived(onUrl);
   *   },
   */
  subscribeDeepLink?: (onUrl: (url: string) => void) => (() => void) | void;
};

/** 비어 있으면 어트리뷰션 미사용. 런타임 비용 0. */
export const attributionAdapter: AttributionAdapter = {};
