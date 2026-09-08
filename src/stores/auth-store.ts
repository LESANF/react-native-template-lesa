/**
 * 인증 상태의 런타임 진실. state = 진실, MMKV = 재시작 복원용 시드.
 * 스토어 읽기 규칙(훅 vs getState)은 `docs/data-layer.md`.
 */
import { create } from 'zustand';

import { getItem, removeItem, setItem } from '@/lib/storage';

const AUTH_TOKEN_KEY = 'auth.token';

export type AuthTokenPair = {
  readonly accessToken: string;
  readonly refreshToken?: string;
};

// idle 상태는 두지 않는다 — MMKV 가 동기라 화면이 관측할 구간이 없다.
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

// 저장소 JSON 을 검증 없이 믿지 않는다 — 깨진 값으로 signedIn 이 되면 안 된다.
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

  // 세션을 완전히 교체한다. refreshToken 누락 시 보존은 lib/auth 의 refresh 경로가 맡는다.
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
