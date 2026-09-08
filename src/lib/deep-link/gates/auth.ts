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
    // TODO(앱): AUTH_LOGIN_PATH 라우트가 템플릿에 없다 — 만들고 경로를 맞춘다.
    navigationContext.router.push(AUTH_LOGIN_PATH as Href);
  },
};
