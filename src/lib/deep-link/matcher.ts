/**
 * path → RouteHandler. spec 은 `@/constants/deep-link`, 우선순위·추론 규칙은 `docs/routing.md`.
 */

import type { Href } from 'expo-router';

import {
  DYNAMIC_ROUTES_SPEC,
  EXTERNAL_WEB_PAGE_PATTERNS,
  SAFE_FALLBACK_PATH,
  STATIC_DEEP_LINK_ROUTES,
} from '@/constants/deep-link';
import { tabRoutes } from '@/constants/tab-routes';
import { useAuthStore } from '@/stores/auth-store';

import type { DynamicRouteSpec, StaticRoute } from '@/constants/deep-link';
import type { NavigationResetToTabOptions, NavigationTabName } from '@/hooks/use-navigation-reset';
import type { EntrySource, ParsedDeepLink, RouteHandler } from './types';

// ─── Lookup tables ──────────────────────────────────────────

type StaticEntry = { name: string; route: StaticRoute };
type DynamicEntry = {
  name: keyof typeof DYNAMIC_ROUTES_SPEC;
  spec: DynamicRouteSpec;
  patternSegments: readonly string[];
};

const STATIC_BY_APP_PATH = buildStaticIndex('app');
const STATIC_BY_WEB_PATH = buildStaticIndex('web');
const DYNAMIC_BY_FIRST_SEGMENT = buildDynamicIndex();

function buildStaticIndex(transport: 'app' | 'web'): Map<string, StaticEntry> {
  const map = new Map<string, StaticEntry>();
  const entries = Object.entries(STATIC_DEEP_LINK_ROUTES) as [string, StaticRoute][];
  for (const [name, route] of entries) {
    const paths = transport === 'web' ? (route.webPaths ?? []) : route.appPaths;
    for (const path of paths) {
      map.set(path, { name, route });
    }
  }
  return map;
}

function buildDynamicIndex(): Map<string, DynamicEntry[]> {
  const map = new Map<string, DynamicEntry[]>();
  const entries = Object.entries(DYNAMIC_ROUTES_SPEC) as [
    keyof typeof DYNAMIC_ROUTES_SPEC,
    DynamicRouteSpec,
  ][];
  for (const [name, spec] of entries) {
    const patternSegments = spec.appPattern.split('/');
    const firstSegment = patternSegments[0];
    const entry: DynamicEntry = { name, spec, patternSegments };
    const bucket = map.get(firstSegment);
    if (bucket) bucket.push(entry);
    else map.set(firstSegment, [entry]);
  }
  for (const bucket of map.values()) {
    bucket.sort(
      (left, right) =>
        Number(Boolean(right.spec.queryDriven)) - Number(Boolean(left.spec.queryDriven))
    );
  }
  return map;
}

// ─── Match orchestrator ─────────────────────────────────────

export function matchRoute(parsed: ParsedDeepLink): RouteHandler | null {
  if (!parsed.path) return null;

  const queryDrivenHandler = matchDynamic(parsed, { queryDrivenOnly: true });
  if (queryDrivenHandler) return queryDrivenHandler;

  const staticHandler = matchStatic(parsed);
  if (staticHandler) return staticHandler;

  if (matchExternalWebPage(parsed)) return buildExternalWebPageHandler(parsed.path);

  return matchDynamic(parsed, { queryDrivenOnly: false });
}

export function deepLinkToExpoPath(parsed: ParsedDeepLink): string {
  return matchRoute(parsed)?.expoPath ?? SAFE_FALLBACK_PATH;
}

function isExternalEntry(entrySource: EntrySource): boolean {
  return entrySource === 'cold' || entrySource === 'background' || entrySource === 'overlay-tap';
}

// ─── STATIC ────────────────────────────────────────────────

function matchStatic(parsed: ParsedDeepLink): RouteHandler | null {
  const map = parsed.transport === 'web-link' ? STATIC_BY_WEB_PATH : STATIC_BY_APP_PATH;
  const entry = map.get(parsed.path);
  if (!entry) return null;
  return buildStaticHandler(entry.name, entry.route);
}

function buildStaticHandler(name: string, route: StaticRoute): RouteHandler {
  if (route.whenAuthenticated && useAuthStore.getState().status === 'signedIn') {
    return buildAuthenticatedRedirectHandler(name, route.whenAuthenticated);
  }

  return {
    name: `static:${name}`,
    expoPath: route.to,
    // 이게 없으면 auth 게이트가 있는 cold 진입에서 splash 위에 로그인 모달이 갇힌다 —
    // `docs/routing.md`.
    safeFallbackExpoPath: route.gates?.includes('auth') ? SAFE_FALLBACK_PATH : undefined,
    match: () => true,
    gates: route.gates ?? [],
    navigate: (_parsed, entrySource, navigationContext) => {
      if (isExternalEntry(entrySource)) {
        if (route.reset) {
          navigationContext.reset(route.reset as NavigationResetToTabOptions);
          return;
        }
        const inferred = inferResetFromTo(route.to);
        if (inferred) {
          navigationContext.reset(inferred);
          return;
        }
      }
      navigationContext.router.navigate(route.to as Href);
    },
  };
}

function buildAuthenticatedRedirectHandler(
  originalName: string,
  redirect: NonNullable<StaticRoute['whenAuthenticated']>
): RouteHandler {
  return {
    name: `static:${originalName}-redirected`,
    expoPath: redirect.to,
    match: () => true,
    gates: [],
    navigate: (_parsed, entrySource, navigationContext) => {
      if (isExternalEntry(entrySource)) {
        navigationContext.reset(redirect.reset as NavigationResetToTabOptions);
        return;
      }
      navigationContext.router.navigate(redirect.to as Href);
    },
  };
}

const TABS_PREFIX = '/(tabs)';
const LEADING_SLASH = /^\//;

/** `to` → reset 옵션. 추론 표는 `docs/routing.md`. */
function inferResetFromTo(to: string): NavigationResetToTabOptions | null {
  if (!to.startsWith(TABS_PREFIX)) return null;

  const remaining = to.slice(TABS_PREFIX.length);

  if (remaining.startsWith('?')) {
    const params = Object.fromEntries(new URLSearchParams(remaining.slice(1)));
    return { tab: 'index', stack: [{ name: 'index', params }] };
  }

  const pathPart = remaining.replace(LEADING_SLASH, '');
  if (!pathPart) {
    return { tab: 'index', stack: ['index'] };
  }

  const parts = pathPart.split('/').filter(Boolean);
  const tab = toTabName(parts[0]);
  // 미등록 탭으로 reset 하면 네비게이션이 통째로 실패한다.
  if (!tab) return null;

  if (parts.length === 1) return { tab, stack: ['index'] };
  return { tab, stack: ['index', ...parts.slice(1)] };
}

const TAB_NAMES: readonly string[] = tabRoutes.map(route => route.name);

/** `to` 의 세그먼트가 실제 탭인지 — 오타를 조용한 실패로 만들지 않는다. */
function toTabName(candidate: string | undefined): NavigationTabName | null {
  if (!candidate || !TAB_NAMES.includes(candidate)) {
    if (candidate) console.warn(`[deep-link] 등록되지 않은 탭 이름: ${candidate}`);
    return null;
  }
  return candidate as NavigationTabName;
}

// ─── EXTERNAL WEB PAGE ─────────────────────────────────────
// TODO(앱): `EXTERNAL_WEB_PAGE_PATTERNS` 를 채우기 전에 `/external-web` 라우트를 만들어야 한다.

function matchExternalWebPage(parsed: ParsedDeepLink): boolean {
  return EXTERNAL_WEB_PAGE_PATTERNS.some(pattern => pattern.test(parsed.path));
}

function buildExternalWebPageHandler(path: string): RouteHandler {
  // 파서가 %26 을 디코드해 넘기므로 재인코딩이 필수다 — 안 하면 '&' 에서 잘린다.
  const expoPath = `/external-web?${new URLSearchParams({ path: `/${path}` }).toString()}`;
  return {
    name: `external-web:${path}`,
    expoPath,
    match: () => true,
    gates: [],
    navigate: (_parsed, entrySource, navigationContext) => {
      if (isExternalEntry(entrySource)) {
        navigationContext.reset({
          tab: 'index',
          stack: ['index'],
          topRoute: { name: 'external-web', params: { path: `/${path}` } },
        } as NavigationResetToTabOptions);
        return;
      }
      navigationContext.router.push(expoPath as Href);
    },
  };
}

// ─── DYNAMIC ───────────────────────────────────────────────

function matchDynamic(
  parsed: ParsedDeepLink,
  options: { queryDrivenOnly: boolean }
): RouteHandler | null {
  const firstSegment = parsed.segments[0];
  if (!firstSegment) return null;

  const bucket = DYNAMIC_BY_FIRST_SEGMENT.get(firstSegment);
  if (!bucket) return null;

  for (const entry of bucket) {
    const isQueryDriven = Boolean(entry.spec.queryDriven);
    if (options.queryDrivenOnly !== isQueryDriven) continue;

    const matchedParams = matchPattern(parsed, entry);
    if (matchedParams) return buildDynamicHandler(entry, matchedParams, parsed.query);
  }
  return null;
}

function matchPattern(parsed: ParsedDeepLink, entry: DynamicEntry): Record<string, string> | null {
  const { patternSegments, spec } = entry;

  if (spec.queryDriven) {
    const keys = Array.isArray(spec.queryDriven) ? spec.queryDriven : [spec.queryDriven];
    if (!keys.some(key => key in parsed.query)) return null;
  }
  if (parsed.segments.length !== patternSegments.length) return null;

  const matchedParams: Record<string, string> = {};
  for (let segmentIndex = 0; segmentIndex < patternSegments.length; segmentIndex++) {
    const patternSegment = patternSegments[segmentIndex];
    const inputSegment = parsed.segments[segmentIndex];
    if (patternSegment.startsWith(':')) {
      matchedParams[patternSegment.slice(1)] = inputSegment;
    } else if (patternSegment !== inputSegment) {
      return null;
    }
  }
  return matchedParams;
}

// TODO(앱): 라우트별 고유 동작은 `DYNAMIC_ROUTES_SPEC` 의 `navigate` 로 넣는다. 여기 기본
// 이동은 손대지 않는다 — KR 이 무엇을 넣었는지는 `docs/routing.md`.
function buildDynamicHandler(
  entry: DynamicEntry,
  matchedParams: Record<string, string>,
  query: Record<string, string>
): RouteHandler {
  const { name, spec } = entry;
  const expoPath = spec.toExpoPath(matchedParams, query);

  return {
    name: `dynamic:${name}`,
    expoPath,
    match: () => true,
    gates: spec.gates ?? [],
    safeFallbackExpoPath: spec.safeFallbackExpoPath,
    navigate: (parsed, entrySource, navigationContext) => {
      if (spec.navigate) {
        return spec.navigate(parsed, entrySource, navigationContext, matchedParams);
      }

      // 동적 라우트는 reset 을 추론하지 않는다 — 구체 세그먼트('42')는 라우트 이름('[id]')이
      // 아니라서 추론한 stack 이 매칭되지 않는다. 필요하면 spec.navigate 로.
      if (entrySource === 'cold') {
        navigationContext.router.replace(expoPath as Href);
        return;
      }
      if (isExternalEntry(entrySource)) {
        navigationContext.router.navigate(expoPath as Href);
        return;
      }
      navigationContext.router.push(expoPath as Href);
    },
  };
}
