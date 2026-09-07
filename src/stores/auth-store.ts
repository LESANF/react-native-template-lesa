/**
 * auth-store — 인증 상태의 런타임 진실.
 *
 * [스토어 읽기 규칙 — 전 스토어 공통]
 * - 렌더에 쓰는 값(화면 분기·표시): useAuthStore((s) => s.status) 훅. 구독이라 바뀌면 리렌더.
 * - 핸들러/인터셉터/React 밖: useAuthStore.getState(). 호출 "순간"의 스냅샷.
 * - getState()는 구독이 아니다 — 렌더 본문에서 쓰면 값이 바뀌어도 화면이 안 바뀐다.
 * - getState() 결과를 변수에 담아 await 너머에서 쓰지 않는다. 쓰는 줄에서 다시 호출.
 *
 * [영속화] state = 런타임 진실, MMKV = 재시작 복원용 시드 (JP auth-store와 같은 모양).
 * signIn/signOut이 둘 다 쓰고, hydrateAuth()가 시드→state를 복원하며, 읽기는 항상 state에서 한다.
 */
import { create } from 'zustand';

import { getItem, removeItem, setItem } from '@/lib/storage';

const AUTH_TOKEN_KEY = 'auth.token';

export type AuthTokenPair = {
  readonly accessToken: string;
  readonly refreshToken?: string;
};

// idle(하이드레이션 대기) 상태는 두지 않는다 — MMKV가 동기라 hydrateAuth()가
// 렌더 시작 전에 끝나서, 화면이 그 상태를 관측할 수 있는 구간 자체가 없다.
type AuthStatus = 'signedIn' | 'signedOut';

type AuthState = {
  readonly status: AuthStatus;
  readonly token: AuthTokenPair | null;
  readonly signIn: (tokens: AuthTokenPair) => void;
  readonly signOut: () => void;
};

const INITIAL_STATE: Pick<AuthState, 'status' | 'token'> = {
  status: 'signedOut',
  token: null,
};

// 저장소에서 읽은 JSON은 검증 없이 믿지 않는다 — 깨진 값으로 signedIn이 되면 안 된다.
function isAuthTokenPair(value: unknown): value is AuthTokenPair {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const accessToken = Reflect.get(value, 'accessToken');
  const refreshToken = Reflect.get(value, 'refreshToken');

  return (
    typeof accessToken === 'string' &&
    accessToken.length > 0 &&
    (refreshToken === undefined || (typeof refreshToken === 'string' && refreshToken.length > 0))
  );
}

export const useAuthStore = create<AuthState>(set => ({
  ...INITIAL_STATE,

  // fresh sign-in은 전달받은 토큰 쌍으로 세션을 완전히 교체한다.
  // (refresh 응답에 refreshToken이 빠졌을 때의 보존은 lib/auth의 refresh 경로가 담당)
  signIn: tokens => {
    setItem(AUTH_TOKEN_KEY, tokens);
    set({ status: 'signedIn', token: tokens });
  },

  signOut: () => {
    removeItem(AUTH_TOKEN_KEY);
    set({ status: 'signedOut', token: null });
  },
}));

export function hydrateAuth(): void {
  try {
    const stored = getItem(AUTH_TOKEN_KEY);
    const token = isAuthTokenPair(stored) ? stored : null;
    if (!token) removeItem(AUTH_TOKEN_KEY);

    useAuthStore.setState(
      token ? { status: 'signedIn', token } : { status: 'signedOut', token: null }
    );
  } catch {
    useAuthStore.setState({ status: 'signedOut', token: null });
  }
}
