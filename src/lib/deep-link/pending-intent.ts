/**
 * 미인증 딥링크의 deferred intent holder (KR `features/auth/store/pending-deep-link-intent.ts` 이식).
 *
 *   1. dispatcher: auth 게이트 미통과 → pendingDeepLinkIntent.set(onResolve)
 *   2. 로그인 화면(AUTH_LOGIN_PATH) 진입
 *   3. 로그인 성공 → AuthDeferredRunner 가 consume → intent 실행
 *   4. 사용자가 취소 → 60초 뒤 폐기 (한참 뒤에 갑자기 화면이 튀지 않게)
 *
 * 스토어가 아니라 모듈 싱글턴인 이유: 구독자가 없다. 값이 바뀌어도 리렌더할 화면이 없다.
 */

const STALE_TIMEOUT_MS = 60_000;

let pendingIntent: (() => void) | null = null;
let staleTimer: ReturnType<typeof setTimeout> | null = null;

function clearStaleTimer() {
  if (staleTimer) {
    clearTimeout(staleTimer);
    staleTimer = null;
  }
}

export const pendingDeepLinkIntent = {
  set(intent: () => void) {
    pendingIntent = intent;
    clearStaleTimer();
    staleTimer = setTimeout(() => {
      pendingIntent = null;
      staleTimer = null;
    }, STALE_TIMEOUT_MS);
  },
  clear() {
    pendingIntent = null;
    clearStaleTimer();
  },
  consume() {
    const intent = pendingIntent;
    pendingIntent = null;
    clearStaleTimer();
    return intent;
  },
};
