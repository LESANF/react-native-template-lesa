/**
 * OS 링크를 라우팅 전에 가로챈다 — `docs/boot.md`.
 * **enqueue 금지**(RN Linking 과 중복). React 밖이라 스토어는 `getState()` 만.
 */

import { Env } from '@env';

import {
  DEEP_LINK_HTTPS_HOSTS,
  SAFE_FALLBACK_PATH,
  SAFE_REDIRECT_PATH,
} from '@/constants/deep-link';
import { deepLinkDispatcher } from '@/lib/deep-link/dispatcher';
import { matchRoute } from '@/lib/deep-link/matcher';
import { parseDeepLink } from '@/lib/deep-link/parser';
import { useAuthStore } from '@/stores/auth-store';

const APP_SCHEME_PREFIX = `${Env.identity.scheme}://`;

function isDeepLink(path: string): boolean {
  if (path.startsWith(APP_SCHEME_PREFIX)) return true;
  if (path.startsWith('https://')) {
    try {
      return DEEP_LINK_HTTPS_HOSTS.includes(new URL(path).host);
    } catch {
      return false;
    }
  }
  return false;
}

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  console.log('[+native-intent:redirectSystemPath] in:', { initial });
  try {
    // 우리 링크가 아니면 손대지 않는다.
    if (!isDeepLink(path)) return path;

    if (initial) {
      console.log('[+native-intent:redirectSystemPath] cold → splash');
      deepLinkDispatcher.markSplashReopened();
      return SAFE_REDIRECT_PATH;
    }

    const parsed = parseDeepLink(path);
    const handler = parsed ? matchRoute(parsed) : null;

    // 게이트 우선 라우트 — 그 화면을 먼저 깐다.
    if (handler?.safeFallbackExpoPath) return handler.safeFallbackExpoPath;

    // 비인증 + auth 게이트 — mount 를 막는다(401 무한 cycle).
    if (handler?.gates.includes('auth') && useAuthStore.getState().status !== 'signedIn') {
      return SAFE_FALLBACK_PATH;
    }

    return handler?.expoPath ?? SAFE_FALLBACK_PATH;
  } catch (error) {
    // throw 하면 링크로 열 때마다 죽는다. 무조건 경로를 돌려준다.
    console.error('[deep-link/native-intent] error', error);
    return SAFE_REDIRECT_PATH;
  }
}
