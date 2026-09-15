/**
 * 딥링크 파싱. 여기가 틀리면 알림을 눌러도 아무 일이 없거나 엉뚱한 화면이 열린다.
 * 파서는 `@env` 와 상수만 쓰는 순수 모듈이라 목 없이 돈다.
 */
import { Env } from '@env';

import { DEEP_LINK_HTTPS_HOSTS } from '@/constants/deep-link';
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

  it('인코딩된 슬래시가 세그먼트 개수를 바꾸지 않는다 — 재분할하면 라우트가 어긋난다', () => {
    const parsed = parse(`${scheme}://menu-4/${encodeURIComponent('a/b')}`)!;
    expect(parsed.segments).toEqual(['menu-4', 'a/b']);
    expect(parsed.path).toBe('menu-4/a/b');
  });

  it('인코딩된 공백·한글을 디코딩해서 세그먼트에 담는다', () => {
    expect(parse(`${scheme}://menu-4/${encodeURIComponent('a b')}`)?.segments).toEqual([
      'menu-4',
      'a b',
    ]);
    expect(parse(`${scheme}://menu-4/${encodeURIComponent('한글-아이디')}`)?.segments).toEqual([
      'menu-4',
      '한글-아이디',
    ]);
  });
});
