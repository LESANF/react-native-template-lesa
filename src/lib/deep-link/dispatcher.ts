/**
 * Deep link 모듈의 진입점. 큐 + 중복 제거 + 순차 처리. (KR `lib/deep-link/dispatcher.ts` 이식)
 *
 * 흐름: enqueue → processNextEntry → matchRoute → runGates → handler.navigate
 *
 * 큐가 필요한 이유는 두 가지다.
 *   1. cold 진입은 네비게이터가 준비되기 전에 도착한다 → splash 가 닫힐 때까지 붙잡아 둔다.
 *   2. 같은 링크가 여러 source(OS Linking, 푸시, 인앱)로 동시에 들어온다 → 한 번만 처리한다.
 */

import { Linking } from 'react-native';

import { HANDLED_MAX, HANDLED_TTL_MS, SAFE_FALLBACK_PATH } from '@/constants/deep-link';

import { GATE_MAP, runGates } from './gates';
import { matchRoute } from './matcher';
import { parseDeepLink } from './parser';

import type { Href } from 'expo-router';
import type { DeepLinkPayload, EntrySource, NavigateContext } from './types';

const queue: DeepLinkPayload[] = [];
/** cold 진입만 splash 종료를 기다린다. background/foreground-tap/in-app 은 즉시. */
let isSplashClosed = false;
let isProcessing = false;
let navigateContext: NavigateContext | null = null;
const lastHandled = new Map<string, number>();

/** source 와 무관한 canonical key — 같은 화면을 가리키면 같은 키가 나와야 중복이 잡힌다. */
function makeKey(payload: DeepLinkPayload): string {
  const queryKey = Object.keys(payload.parsed.query)
    .sort()
    .map((key) => `${key}=${payload.parsed.query[key]}`)
    .join('&');
  return `${payload.parsed.path}?${queryKey}`;
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

/** 한 건 처리. cold 가 splash 를 기다리는 동안에도 뒤에 온 bg/fg/in-app 은 먼저 나간다. */
async function processNextEntry() {
  if (isProcessing || queue.length === 0 || !navigateContext) return;

  const readyIndex = queue.findIndex(
    (queuedPayload) => queuedPayload.entrySource !== 'cold' || isSplashClosed,
  );
  if (readyIndex === -1) return;

  isProcessing = true;

  const payload = queue[readyIndex];
  queue.splice(readyIndex, 1);

  try {
    const handler = matchRoute(payload.parsed);
    if (!handler) {
      console.log('[deep-link] 미등록 경로 → noop:', payload.parsed.path);
      return;
    }

    const currentContext = navigateContext;
    await runGates(handler.gates, GATE_MAP, currentContext, () => {
      console.log('[deep-link] navigate:', handler.name);
      // navigate 호출 직후 동기적으로 표시한다 — 두 source(푸시 RNFB + notifee 등)가 같은 링크로 겹쳐도
      // 이력에 남아 이중 navigate 가 되지 않는다. (KR 과 같은 순서, navigate 는 await 하지 않는다)
      void handler.navigate(payload.parsed, payload.entrySource, currentContext);
      markHandled(payload);
    });
  } catch (error) {
    console.error('[deep-link] dispatch error', error);
    // cold 진입은 splash 가 이 dispatcher 에 이동을 위임한 상태다 — 여기서 실패하면 splash 에 갇힌다.
    // KR 에는 없는 가드: 안전 경로로 빠져나온다. (등록 라우트의 navigate 가 throw 한 경우)
    if (payload.entrySource === 'cold' && navigateContext) {
      try {
        navigateContext.router.replace(SAFE_FALLBACK_PATH as Href);
      } catch (fallbackError) {
        console.error('[deep-link] safe fallback failed', fallbackError);
      }
    }
  } finally {
    isProcessing = false;
    if (queue.length > 0) void processNextEntry();
  }
}

export const deepLinkDispatcher = {
  /**
   * 어트리뷰션 SDK 등 외부 SDK 콜백으로 들어온 URL (KR 은 Airbridge 의 deeplink 콜백이 여기로 왔다).
   * SDK 는 entrySource 를 알려주지 않는다 — splash 상태로 cold/background 를 판별한다.
   */
  enqueueExternalSdkUrl(url: string | null | undefined) {
    this.enqueue(url, isSplashClosed ? 'background' : 'cold');
  },

  /** 모든 진입 source 의 단일 입구. 파싱 실패/남의 링크는 noop. */
  enqueue(url: string | null | undefined, entrySource: EntrySource) {
    const parsed = parseDeepLink(url);
    if (!parsed || parsed.transport === 'unknown' || !parsed.path) return;

    // splash 가 아직 열려 있는데 background/foreground-tap 이 도착하면(알림 탭으로 켠 콜드 진입을
    // OS/SDK 가 그렇게 알려주기도 한다) '/splash' 위에 push 되어 버린다. 어느 API 가 탭을 전달하든
    // 무관하게, splash 가 닫힐 때까지 cold 로 홀드한다. in-app 은 화면이 이미 떠 있다는 뜻이라 제외.
    if (!isSplashClosed && entrySource !== 'in-app') entrySource = 'cold';

    const payload: DeepLinkPayload = {
      parsed,
      entrySource,
      receivedAt: Date.now(),
    };

    if (isDuplicate(payload)) return;

    const payloadKey = makeKey(payload);
    if (queue.some((queuedPayload) => makeKey(queuedPayload) === payloadKey)) return;

    console.log('[deep-link] enqueue:', { path: parsed.path, entrySource });
    queue.push(payload);
    void processNextEntry();
  },

  /** splash 종료. 붙잡아 둔 cold 진입 처리를 시작한다. */
  notifySplashClosed() {
    if (isSplashClosed) return;
    isSplashClosed = true;
    void processNextEntry();
  },

  /** splash 재진입(외부 링크 cold 등). 다시 닫힐 때까지 cold 를 붙잡는다. */
  markSplashReopened() {
    isSplashClosed = false;
  },

  /** router/queryClient/reset 등록. useDeepLink 가 호출한다. */
  bindContext(navigationContext: NavigateContext) {
    navigateContext = navigationContext;
  },

  /** 처리 대기 중인 링크가 있는지. splash 가 "(tabs) 로 갈지, 링크에 맡길지" 판단에 쓴다. */
  hasQueue() {
    return queue.length > 0;
  },

  /**
   * 큐 첫 cold entry 의 `safeFallbackExpoPath` peek (mutation 없음). splash → dispatcher 핸드오프 시
   * 밑에 깔 화면을 정한다 — 이게 없으면 미등록 링크로 콜드 진입했을 때 dispatcher 가 noop 하고 splash 에 갇힌다.
   *   미등록 라우트                → 안전 경로(홈)
   *   등록 + safeFallback 지정     → 그 화면 (게이트 UI 가 그 위에 뜬다)
   *   등록 + fallback 미지정       → null (dispatcher 의 이동 흐름 그대로)
   */
  peekSafeFallback(): string | null {
    const next = queue.find((queuedPayload) => queuedPayload.entrySource === 'cold');
    if (!next) return null;
    const handler = matchRoute(next.parsed);
    if (!handler) return SAFE_FALLBACK_PATH;
    return handler.safeFallbackExpoPath ?? null;
  },

  /**
   * enqueue + 매처 미등록 URL fallback. 서버가 보내는 링크가 매처에 없을 수 있다 — silent noop 이면
   * "탭했는데 아무 일도 안 남"이 되므로 최소한의 결과를 보장한다. in-app 호출처(배너·알림 목록 등)가 쓴다.
   *   매처 등록 path            → 정상 enqueue
   *   우리 도메인 미등록 path   → 안전 경로. TODO(앱): KR 은 `/external-web?path=…` 인앱 웹뷰로 보낸다
   *   외부 도메인               → 시스템 브라우저 (Linking.openURL)
   *   parse 실패                → noop
   */
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
