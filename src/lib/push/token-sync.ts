/** FCM 토큰 ↔ 서버 동기화. 서버 계약은 앱마다 달라 어댑터만 둔다 — `docs/push.md`. */

import { deleteToken, getToken, onTokenRefresh } from '@react-native-firebase/messaging';

import { useAuthStore } from '@/stores/auth-store';

import { getPushMessaging, isPushConfigured } from './core';

export type PushTokenSyncAdapter = {
  register(token: string): Promise<void>;
  unregister(token: string): Promise<void>;
};

// TODO(앱): 실제 등록/해제 endpoint 로 교체한다. 메서드 본문만 갈아끼운다.
export const pushTokenSyncAdapter: PushTokenSyncAdapter = {
  register: async token => {
    console.log('[push] TODO(앱) register token:', token.slice(0, 12) + '…');
  },
  unregister: async token => {
    console.log('[push] TODO(앱) unregister token:', token.slice(0, 12) + '…');
  },
};

let started = false;
let lastRegistered: string | null = null;
/** auth 전이와 onTokenRefresh 가 같은 tick 에 겹쳐도 POST 는 한 번이다. */
let inFlight: Promise<void> | null = null;

async function register(token: string): Promise<void> {
  if (token === lastRegistered) return;
  await pushTokenSyncAdapter.register(token);
  lastRegistered = token;
}

async function syncIfSignedIn(): Promise<void> {
  if (useAuthStore.getState().status !== 'signedIn') return;
  if (inFlight) return inFlight;

  // try/catch/finally 는 반드시 이 안에 — 밖에 두면 두 번째 호출자의 promise 가 rejected 로
  // 남아 unhandled rejection 이 된다(호출부는 전부 `void`).
  inFlight = (async () => {
    try {
      const token = await getToken(getPushMessaging());
      // fetch 중 로그아웃했으면 등록하지 않는다.
      if (useAuthStore.getState().status !== 'signedIn') return;
      await register(token);
    } catch (error) {
      // iOS 는 APNs 토큰 도착 전에 throw 한다 — 삼키면 onTokenRefresh 가 회복시킨다.
      console.log('[push] 토큰 동기화 실패 — onTokenRefresh 를 기다린다', error);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** 멱등. cleanup 을 돌려주지 않는다 — splash 가 unmount 돼도 구독은 앱 수명 동안 살아야 한다. */
export function startPushTokenSync(): void {
  if (started || !isPushConfigured) return;
  started = true;

  void syncIfSignedIn();

  useAuthStore.subscribe((state, prev) => {
    if (prev.status === 'signedOut' && state.status === 'signedIn') void syncIfSignedIn();

    if (prev.status === 'signedIn' && state.status === 'signedOut') {
      lastRegistered = null;
      void deleteToken(getPushMessaging()).catch(error =>
        console.log('[push] deleteToken 실패', error)
      );
    }
  });

  onTokenRefresh(getPushMessaging(), token => {
    // 로그아웃 직후 deleteToken 이 유발하는 refresh 를 여기서 막는다. 별도 플래그가 필요 없다.
    if (useAuthStore.getState().status !== 'signedIn') return;
    void register(token);
  });
}

// TODO(앱): 로그아웃 시 signOut() **전에** await 한다 — 인증 헤더가 필요하다.
export async function unregisterPushToken(): Promise<void> {
  if (!lastRegistered) return;
  await pushTokenSyncAdapter.unregister(lastRegistered);
}
