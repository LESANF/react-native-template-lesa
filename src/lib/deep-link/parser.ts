import { Env } from '@env';

import { DEEP_LINK_HTTPS_HOSTS } from '@/constants/deep-link';

import type { LinkTransport, ParsedDeepLink } from './types';

const APP_SCHEMES: readonly string[] = [Env.identity.scheme];

// 등록 호스트마다 apex + www 두 변형을 모두 매칭한다.
const WEB_HOSTS = DEEP_LINK_HTTPS_HOSTS.flatMap(host => {
  const apex = host.replace(/^www\./, '');
  return [apex, `www.${apex}`];
});

const SCHEME_TRAILING_COLON = /:$/;

// TODO(앱): 웹과 앱 URL 이 1:1 이면 비워 둔다. 첫 매칭만 적용 — 예시는 `docs/routing.md`.
const WEB_TO_APP_PATH_ALIASES: [RegExp, string][] = [];

// alias 보다 먼저 적용되고 소비한 query 키는 제거된다. TODO(앱): 예시는 `docs/routing.md`.
const WEB_QUERY_TO_PATH_RULES: {
  matchPath: (path: string) => boolean;
  queryKey: string;
  toPath: (value: string) => string;
}[] = [];

/** 남의 링크는 `transport: 'unknown'`, 경로 없는 우리 링크는 `null` — `docs/routing.md`. */
export function parseDeepLink(input: string | null | undefined): ParsedDeepLink | null {
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const scheme = url.protocol.replace(SCHEME_TRAILING_COLON, '');
  const query = Object.fromEntries(url.searchParams);

  // 앱 스킴은 특수 스킴이 아니라 첫 세그먼트가 host 로 잘린다 (myapp://menu-4/42 → host='menu-4').
  if (APP_SCHEMES.includes(scheme)) {
    const path = normalizePath(`${url.host}/${url.pathname}`);
    if (!path) return null;
    return buildParsed('app-scheme', path, query, input);
  }

  if (scheme === 'https' && WEB_HOSTS.includes(url.host)) {
    const rawPath = normalizePath(url.pathname);
    if (!rawPath) return null;
    const { path, query: rewrittenQuery } = applyWebNormalization(rawPath, query);
    return buildParsed('web-link', path, rewrittenQuery, input);
  }

  return buildParsed('unknown', '', query, input);
}

function buildParsed(
  transport: LinkTransport,
  path: string,
  query: Record<string, string>,
  raw: string
): ParsedDeepLink {
  return {
    transport,
    path,
    segments: path ? path.split('/') : [],
    query,
    raw,
  };
}

function applyWebNormalization(
  rawPath: string,
  rawQuery: Record<string, string>
): { path: string; query: Record<string, string> } {
  for (const rule of WEB_QUERY_TO_PATH_RULES) {
    if (rule.matchPath(rawPath) && rawQuery[rule.queryKey]) {
      const value = rawQuery[rule.queryKey];
      const { [rule.queryKey]: _consumed, ...restQuery } = rawQuery;
      return { path: rule.toPath(value), query: restQuery };
    }
  }

  for (const [pattern, replacement] of WEB_TO_APP_PATH_ALIASES) {
    if (pattern.test(rawPath)) {
      return { path: rawPath.replace(pattern, replacement), query: rawQuery };
    }
  }

  return { path: rawPath, query: rawQuery };
}

function normalizePath(raw: string): string {
  return raw.split('/').filter(Boolean).map(safeDecode).join('/');
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // 잘못 인코딩된 세그먼트 때문에 링크 전체를 버리지 않는다.
    return segment;
  }
}
