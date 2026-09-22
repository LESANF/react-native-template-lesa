import { readFileSync } from 'node:fs';
import path from 'node:path';

// 값은 런타임에 CSS 에서 읽는다. 여기서는 이름만 본다 — 이름이 틀리면 기기에서 색이 조용히 undefined 가 된다.
const read = (file: string) => readFileSync(path.join(__dirname, file), 'utf8');
const primitives = read('../../styles/tokens/colors.css');
const semantic = read('../../styles/tokens/semantic.css');
const hookNames = [...read('./use-colors.ts').matchAll(/'(--color-[\w-]+)'/g)].map(m => m[1]);
const block = (src: string, head: RegExp) => {
  const start = src.search(head);
  const body = src.slice(start, src.indexOf('}', start));
  return [...body.matchAll(/(--color-[\w-]+):/g)].map(m => m[1]);
};

describe('useColors', () => {
  it('변수를 하나 이상 읽는다', () => expect(hookNames.length).toBeGreaterThan(0));

  it.each(hookNames)('%s 가 CSS 토큰에 정의돼 있다', name => {
    expect(primitives + semantic).toContain(`${name}:`);
  });

  it('토큰은 @theme static 이다 — className 에 안 쓴 색이 빌드에서 빠지지 않는다', () => {
    expect(primitives + semantic).not.toMatch(/@theme\s*\{/);
  });

  it('dark 는 light 와 같은 의미 토큰 집합이다 — 한쪽에만 추가하면 다른 테마에서 값이 빈다', () => {
    const light = block(semantic, /@theme static \{/).sort();
    const dark = block(semantic, /@variant dark \{/).sort();
    expect(dark).toEqual(light);
  });
});
