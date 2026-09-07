/**
 * Auth gate (deferred) — KR `lib/deep-link/gates/auth.ts` 이식.
 *   check  : 로그인 여부
 *   request: pendingDeepLinkIntent 에 onResolve 를 맡기고 로그인 화면을 연다.
 *            로그인 성공 → AuthDeferredRunner 가 consume → onResolve(=원래 이동) 실행.
 *            사용자가 취소하면 60초 뒤 폐기된다.
 */

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
    // TODO(앱): AUTH_LOGIN_PATH 라우트가 아직 템플릿에 없다 — 로그인 화면을 만들고 경로를 맞춰라.
    navigationContext.router.push(AUTH_LOGIN_PATH as Href);
  },
};
