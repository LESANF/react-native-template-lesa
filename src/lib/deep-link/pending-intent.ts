/**
 * 미인증 딥링크의 deferred intent holder. 흐름은 `docs/boot.md`.
 * 취소 시 60초 뒤 폐기한다 — 한참 뒤에 갑자기 화면이 튀지 않게.
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
