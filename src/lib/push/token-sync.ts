/**
 * FCM 토큰 ↔ 서버 동기화. 앱 수명 싱글턴이며 로그인 상태 전이를 스토어 구독으로 따라간다.
 *
 * 여기가 "서버 계약"의 이음매다 — 참조 앱 KR 은 `{deviceId, deviceType, pushToken}`,
 * JP 는 `{platform, token}` 을 보낸다. 앱마다 다르므로 템플릿은 어댑터만 정의한다.
 */

import { deleteToken, getToken, onTokenRefresh } from '@react-native-firebase/messaging';

import { useAuthStore } from '@/stores/auth-store';

import { getPushMessaging, isPushConfigured } from './core';

export type PushTokenSyncAdapter = {
  register(token: string): Promise<void>;
  unregister(token: string): Promise<void>;
};

/**
 * TODO(앱): 실제 등록/해제 endpoint 로 교체한다(`@/api/...` 의 request 함수를 호출).
 * 바디 모양은 서버 계약이라 템플릿이 정하지 않는다 — 위 주석의 KR/JP 예시 참고.
 * export 는 테스트가 스파이를 끼우기 위한 것 — 앱 코드는 이 객체의 메서드 본문을 교체한다.
 */
export const pushTokenSyncAdapter: PushTokenSyncAdapter = {
  register: async token => {
    console.log('[push] TODO(앱) register token:', token.slice(0, 12) + '…');
  },
  unregister: async token => {
    console.log('[push] TODO(앱) unregister token:', token.slice(0, 12) + '…');
  },
};

let started = false;
/** 마지막으로 서버에 올린 토큰 — 같은 값이면 네트워크를 아낀다. */
let lastRegistered: string | null = null;

async function register(token: string): Promise<void> {
  if (token === lastRegistered) return;
  await pushTokenSyncAdapter.register(token);
  lastRegistered = token;
}

async function syncIfSignedIn(): Promise<void> {
  if (useAuthStore.getState().status !== 'signedIn') return;

  let token: string;
  try {
    token = await getToken(getPushMessaging());
  } catch (error) {
    // iOS 는 APNs 토큰이 도착하기 전에 throw 한다. 조용히 넘기면 onTokenRefresh 가 회복시킨다(결함 D1).
    console.log('[push] getToken 실패 — onTokenRefresh 를 기다린다', error);
    return;
  }

  await register(token);
}

/**
 * 프리로더의 권한 스테이지가 끝난 뒤 splash 가 호출한다. 멱등이고 cleanup 을 돌려주지 않는다
 * — splash 는 곧 unmount 되지만 구독은 앱 수명 동안 살아 있어야 한다.
 */
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
    // 로그아웃 직후 deleteToken 이 유발하는 refresh 를 여기서 막는다(결함 D2). 별도 플래그가 필요 없다.
    if (useAuthStore.getState().status !== 'signedIn') return;
    void register(token);
  });
}

/**
 * TODO(앱): 로그아웃 시 signOut() **전에** await — 인증 헤더가 필요하다. deleteToken 은 signedOut
 * 전이 구독이 처리한다(그로 인한 onTokenRefresh 는 status guard 에 걸려 재등록되지 않는다 — 참조 앱 결함 D2 수정).
 */
export async function unregisterPushToken(): Promise<void> {
  if (!lastRegistered) return;
  await pushTokenSyncAdapter.unregister(lastRegistered);
}
