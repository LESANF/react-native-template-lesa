/**
 * expo-router 의 native intent 훅. OS 가 넘긴 링크를 라우팅 전에 가로챈다.
 * https://docs.expo.dev/versions/v57.0.0/router/reference/redirects/
 *
 *   cold (initial=true)  : /splash 로 붙잡아 둔다. 실제 이동은 splash 가 닫힌 뒤 dispatcher 가 결정.
 *   bg   (initial=false) : 링크가 가리키는 실제 경로로 변환 (동적 세그먼트 치환 포함).
 *
 * enqueue 는 하지 않는다 — RN Linking(sources.ts) 이 같은 링크를 이미 물고 있어서 중복이 된다.
 * React 밖에서 도는 코드다 — 앱 상태(스토어)를 읽어야 하면 getState() 스냅샷만.
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
    // 우리 링크가 아니면(앱 내부 라우팅 등) 손대지 않는다.
    if (!isDeepLink(path)) return path;

    if (initial) {
      console.log('[+native-intent:redirectSystemPath] cold → splash');
      deepLinkDispatcher.markSplashReopened();
      return SAFE_REDIRECT_PATH;
    }

    const parsed = parseDeepLink(path);
    const handler = parsed ? matchRoute(parsed) : null;

    // 게이트/비동기 처리가 우선인 라우트 — 그 화면을 먼저 깔고 dispatcher 가 그 위에서 진행한다.
    if (handler?.safeFallbackExpoPath) return handler.safeFallbackExpoPath;

    // 비인증 + auth 게이트 — 화면 mount 자체를 막는다 (401 무한 cycle 방지).
    if (handler?.gates.includes('auth') && useAuthStore.getState().status !== 'signedIn') {
      return SAFE_FALLBACK_PATH;
    }

    return handler?.expoPath ?? SAFE_FALLBACK_PATH;
  } catch (error) {
    // 여기서 throw 하면 앱이 링크로 열릴 때마다 죽는다. 무슨 일이 있어도 경로를 돌려준다.
    console.error('[deep-link/native-intent] error', error);
    return SAFE_REDIRECT_PATH;
  }
}
