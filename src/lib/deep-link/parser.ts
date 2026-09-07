import { Env } from '@env';

import { DEEP_LINK_HTTPS_HOSTS } from '@/constants/deep-link';

import type { LinkTransport, ParsedDeepLink } from './types';

const APP_SCHEMES: readonly string[] = [Env.identity.scheme];

// 등록 호스트마다 apex + www 두 변형을 모두 매칭한다 (KR 이 자기 호스트 하나에 하던 것을 목록으로).
const WEB_HOSTS = DEEP_LINK_HTTPS_HOSTS.flatMap(host => {
  const apex = host.replace(/^www\./, '');
  return [apex, `www.${apex}`];
});

const SCHEME_TRAILING_COLON = /:$/;

/**
 * web path → app canonical. 첫 매칭만 적용한다.
 *
 * TODO(앱): 웹과 앱의 URL 이 1:1 이면 비워 둔다. 다르면 여기서 흡수한다 (KR 예):
 *   [/^my-page\/orders\/.+$/, 'mypage/orders']   상세 ID 를 리스트 path 로 (앱에 상세 화면이 없을 때)
 *   [/^my-page\//, 'mypage/']                    prefix 치환 — 더 구체적인 규칙 뒤에 둔다
 *   [/^app-download$/, 'raffle']                 웹 랜딩 → 앱 화면
 *   [/^product\//, 'products/']                  레거시 단수 path → canonical 복수
 */
const WEB_TO_APP_PATH_ALIASES: [RegExp, string][] = [];

/**
 * web query → app path segment. alias 보다 먼저 적용되고, 소비한 query 키는 제거된다.
 *
 * TODO(앱): KR 예 —
 *   { matchPath: p => p === 'wear', queryKey: 'openSliderStyling', toPath: v => `wear/${v}` }
 *   { matchPath: p => p === 'search/result', queryKey: 'searchKeyword', toPath: v => `search/${v}` }
 */
const WEB_QUERY_TO_PATH_RULES: {
  matchPath: (path: string) => boolean;
  queryKey: string;
  toPath: (value: string) => string;
}[] = [];

/**
 * url 문자열 → 정규화된 링크. 우리 링크가 아니면 transport='unknown' 으로 돌려준다
 * (null 이 아니라 unknown 인 이유: 호출부가 "파싱 실패"와 "남의 링크"를 구분할 필요가 없다).
 * 경로가 없는 우리 링크(bare scheme)는 null — 라우팅할 대상이 없다.
 *
 *   myapp://menu-4/42?mode=edit        → { transport: 'app-scheme', path: 'menu-4/42' }
 *   https://example.com/menu-4/42      → { transport: 'web-link',   path: 'menu-4/42' }  (호스트 등록 시)
 *   https://other.com/whatever         → { transport: 'unknown',    path: '' }
 */
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

/** web path 를 app canonical 로. query→path 규칙이 alias 보다 우선한다. */
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
