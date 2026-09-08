/**
 * 딥링크 진입점 — 큐 + 중복 제거 + 순차 처리. 흐름과 API 표는 `docs/routing.md`.
 */

import { Linking } from 'react-native';

import { HANDLED_MAX, HANDLED_TTL_MS, SAFE_FALLBACK_PATH } from '@/constants/deep-link';

import { GATE_MAP, runGates } from './gates';
import { matchRoute } from './matcher';
import { parseDeepLink } from './parser';

import type { Href } from 'expo-router';
import type { DeepLinkPayload, EntrySource, NavigateContext } from './types';

const queue: DeepLinkPayload[] = [];
let isSplashClosed = false;
let isProcessing = false;
let navigateContext: NavigateContext | null = null;
const lastHandled = new Map<string, number>();

// 손으로 `k=v` 를 이으면 `{a:'b&c=d'}` 와 `{a:'b',c:'d'}` 가 같은 키가 되어 멀쩡한 링크가 버려진다.
function makeKey(payload: DeepLinkPayload): string {
  const params = new URLSearchParams(payload.parsed.query);
  params.sort();
  return `${payload.parsed.path}?${params.toString()}`;
}

function isDuplicate(payload: DeepLinkPayload): boolean {
  const key = makeKey(payload);
  const lastHandledAt = lastHandled.get(key);
  if (!lastHandledAt) return false;
  if (Date.now() - lastHandledAt > HANDLED_TTL_MS) {
    lastHandled.delete(key);
    return false;
  }
  return true;
}

function markHandled(payload: DeepLinkPayload) {
  lastHandled.set(makeKey(payload), Date.now());
  if (lastHandled.size > HANDLED_MAX) {
    const expiredCutoff = Date.now() - HANDLED_TTL_MS;
    for (const [key, handledAt] of lastHandled) {
      if (handledAt < expiredCutoff) lastHandled.delete(key);
    }
  }
}

async function processNextEntry() {
  if (isProcessing || queue.length === 0 || !navigateContext) return;

  const readyIndex = queue.findIndex(
    queuedPayload => queuedPayload.entrySource !== 'cold' || isSplashClosed
  );
  if (readyIndex === -1) return;

  isProcessing = true;

  // 처리 중에도 큐에 남긴다 — 먼저 빼면 `await runGates` 동안 중복 검사에서 사라져
  // 같은 링크가 두 번 통과한다.
  const payload = queue[readyIndex];

  try {
    const handler = matchRoute(payload.parsed);
    if (!handler) {
      console.log('[deep-link] 미등록 경로 → noop:', payload.parsed.path);
      return;
    }

    const currentContext = navigateContext;
    await runGates(handler.gates, GATE_MAP, currentContext, () => {
      console.log('[deep-link] navigate:', handler.name);
      // navigate 직후 동기적으로 표시한다 — await 하면 두 source 가 겹쳐 이중 navigate 가 된다.
      void handler.navigate(payload.parsed, payload.entrySource, currentContext);
      markHandled(payload);
    });
  } catch (error) {
    console.error('[deep-link] dispatch error', error);
    // cold 는 splash 가 이동을 위임한 상태다 — 여기서 실패하면 splash 에 갇힌다.
    if (payload.entrySource === 'cold' && navigateContext) {
      try {
        navigateContext.router.replace(SAFE_FALLBACK_PATH as Href);
      } catch (fallbackError) {
        console.error('[deep-link] safe fallback failed', fallbackError);
      }
    }
  } finally {
    const processedIndex = queue.indexOf(payload);
    if (processedIndex !== -1) queue.splice(processedIndex, 1);
    isProcessing = false;
    if (queue.length > 0) void processNextEntry();
  }
}

export const deepLinkDispatcher = {
  /** 외부 SDK 콜백 URL. entrySource 를 안 주므로 splash 상태로 판별한다. */
  enqueueExternalSdkUrl(url: string | null | undefined) {
    this.enqueue(url, isSplashClosed ? 'background' : 'cold');
  },

  enqueue(url: string | null | undefined, entrySource: EntrySource) {
    const parsed = parseDeepLink(url);
    if (!parsed || parsed.transport === 'unknown' || !parsed.path) return;

    // splash 가 열려 있는데 background/foreground-tap 이 오면 '/splash' 위에 push 된다 —
    // 닫힐 때까지 cold 로 홀드한다. in-app 은 화면이 이미 떠 있다는 뜻이라 제외.
    if (!isSplashClosed && entrySource !== 'in-app') entrySource = 'cold';

    const payload: DeepLinkPayload = {
      parsed,
      entrySource,
      receivedAt: Date.now(),
    };

    if (isDuplicate(payload)) return;

    const payloadKey = makeKey(payload);
    if (queue.some(queuedPayload => makeKey(queuedPayload) === payloadKey)) return;

    console.log('[deep-link] enqueue:', { path: parsed.path, entrySource });
    queue.push(payload);
    void processNextEntry();
  },

  notifySplashClosed() {
    if (isSplashClosed) return;
    isSplashClosed = true;
    void processNextEntry();
  },

  markSplashReopened() {
    isSplashClosed = false;
  },

  bindContext(navigationContext: NavigateContext) {
    navigateContext = navigationContext;
  },

  hasQueue() {
    return queue.length > 0;
  },

  /** splash 밑에 깔 화면. 없으면 미등록 링크 콜드 진입에서 splash 에 갇힌다 — `docs/routing.md`. */
  peekSafeFallback(): string | null {
    const next = queue.find(queuedPayload => queuedPayload.entrySource === 'cold');
    if (!next) return null;
    const handler = matchRoute(next.parsed);
    if (!handler) return SAFE_FALLBACK_PATH;
    return handler.safeFallbackExpoPath ?? null;
  },

  /** 매처에 없는 URL 도 최소한의 결과를 보장한다 — 분기 표는 `docs/routing.md`. */
  async enqueueOrFallback(url: string | null | undefined, entrySource: EntrySource) {
    if (!url) return;
    const parsed = parseDeepLink(url);

    if (parsed && parsed.transport !== 'unknown' && parsed.path) {
      const handler = matchRoute(parsed);
      if (handler) {
        this.enqueue(url, entrySource);
        return;
      }
    }

    try {
      const isOurDomain = parsed?.transport === 'web-link';
      if (isOurDomain && navigateContext) {
        navigateContext.router.navigate(SAFE_FALLBACK_PATH as Href);
        return;
      }
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } catch (error) {
      console.error('[deep-link] enqueueOrFallback fallback error', error);
    }
  },
};
