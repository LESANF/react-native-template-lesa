/** Auth gate(deferred) — 로그인 후 AuthDeferredRunner 가 재생한다. `docs/boot.md`. */

import type { Href } from 'expo-router';

import { AUTH_LOGIN_PATH } from '@/constants/deep-link';
import { pendingDeepLinkIntent } from '@/lib/deep-link/pending-intent';
import { useAuthStore } from '@/stores/auth-store';

import type { Gate } from '.';

export const authGate: Gate = {
  name: 'auth',
  async check() {
    return useAuthStore.getState().status === 'signedIn';
  },
  request(navigationContext, onResolve) {
    pendingDeepLinkIntent.set(onResolve);
    // 자리표시 화면이 `app/auth/login.tsx` 에 있다. TODO(앱): 실제 로그인 UI 로 교체.
    navigationContext.router.push(AUTH_LOGIN_PATH as Href);
  },
};
