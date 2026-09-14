/**
 * 푸시 탭·유니버설 링크가 화면으로 가는 경로. 여기가 틀리면 알림을 눌러도 아무 일이
 * 없거나 엉뚱한 화면이 열린다 — 사용자가 보는 증상은 "앱이 먹통" 이다.
 */
import { Env } from '@env';

import { DEEP_LINK_HTTPS_HOSTS, SAFE_FALLBACK_PATH } from '@/constants/deep-link';
import { deepLinkToExpoPath, matchRoute } from '@/lib/deep-link/matcher';
import { parseDeepLink } from '@/lib/deep-link/parser';

const scheme = Env.identity.scheme;
const parse = (url: string) => parseDeepLink(url);

describe('parseDeepLink', () => {
  it('앱 스킴은 첫 세그먼트가 host 로 잘려도 경로에 포함한다', () => {
    const parsed = parse(`${scheme}://menu-4/42`);
    expect(parsed).toMatchObject({ path: 'menu-4/42', transport: 'app-scheme' });
    expect(parsed?.segments).toEqual(['menu-4', '42']);
  });

  it('query 를 파싱한다', () => {
    expect(parse(`${scheme}://menu-4/42?from=push&ref=a`)?.query).toEqual({
      from: 'push',
      ref: 'a',
    });
  });

  it('경로 없는 우리 링크는 null — 큐에 넣을 것이 없다', () => {
    expect(parse(`${scheme}://`)).toBeNull();
  });

  it('남의 스킴은 transport unknown — 우리가 처리하지 않는다', () => {
    expect(parse('otherapp://menu-4/42')?.transport).toBe('unknown');
  });

  it('URL 이 아니면 null', () => {
    for (const bad of ['', 'not a url', '///', undefined, null]) {
      expect(parse(bad as string)).toBeNull();
    }
  });

  it('슬래시가 겹치거나 후행 슬래시가 있어도 같은 경로로 정규화한다', () => {
    const expected = 'menu-4/42';
    expect(parse(`${scheme}://menu-4/42/`)?.path).toBe(expected);
    expect(parse(`${scheme}://menu-4//42`)?.path).toBe(expected);
  });

  it('등록 호스트가 비면 https 는 처리하지 않는다 (템플릿 기본)', () => {
    if (DEEP_LINK_HTTPS_HOSTS.length > 0) return;
    expect(parse('https://example.com/menu-4/42')?.transport).toBe('unknown');
  });
});

describe('matchRoute', () => {
  it('동적 라우트에서 파라미터를 뽑아 expo 경로를 만든다', () => {
    const handler = matchRoute(parse(`${scheme}://menu-4/42`)!);
    expect(handler?.expoPath).toBe('/(tabs)/menu-4/42');
  });

  it('query 를 expo 경로에 넘긴다 — 붙였다 떼면 컨텍스트가 사라진다', () => {
    const handler = matchRoute(parse(`${scheme}://menu-4/42?from=push`)!);
    expect(handler?.expoPath).toBe('/(tabs)/menu-4/42?from=push');
  });

  it('파라미터가 없으면 매칭하지 않는다', () => {
    expect(matchRoute(parse(`${scheme}://menu-4`)!)).toBeNull();
  });

  it('세그먼트가 더 많으면 매칭하지 않는다 — 느슨한 매칭은 엉뚱한 화면을 연다', () => {
    expect(matchRoute(parse(`${scheme}://menu-4/42/extra`)!)).toBeNull();
  });

  it('미등록 경로는 null', () => {
    expect(matchRoute(parse(`${scheme}://nope/1`)!)).toBeNull();
  });

  it('deepLinkToExpoPath 는 미등록에서 안전 경로로 떨어진다 — null 을 router 에 주지 않는다', () => {
    expect(deepLinkToExpoPath(parse(`${scheme}://nope/1`)!)).toBe(SAFE_FALLBACK_PATH);
  });

  it('인코딩된 파라미터를 디코딩해서 넘기고 경로에는 다시 인코딩한다', () => {
    const handler = matchRoute(parse(`${scheme}://menu-4/${encodeURIComponent('a b')}`)!);
    expect(handler?.expoPath).toBe('/(tabs)/menu-4/a%20b');
  });

  it('인코딩된 슬래시가 세그먼트 개수를 바꾸지 않는다 — 재분할하면 라우트가 어긋난다', () => {
    const parsed = parse(`${scheme}://menu-4/${encodeURIComponent('a/b')}`)!;
    expect(parsed.segments).toEqual(['menu-4', 'a/b']);
    expect(matchRoute(parsed)?.expoPath).toBe('/(tabs)/menu-4/a%2Fb');
  });

  it('한글 파라미터도 경로가 유효하다', () => {
    const handler = matchRoute(parse(`${scheme}://menu-4/${encodeURIComponent('짐로그')}`)!);
    expect(handler?.expoPath).toBe(`/(tabs)/menu-4/${encodeURIComponent('짐로그')}`);
  });
});
