# 색

> `docs/ui.md` "Single source of truth = CSS `@theme`"와 같은 결정이다. 이 문서는 그 결정을 JS·테마까지 확장한 규칙이다.
> carhartt-kr-app에서 검증했다(2026-09-22).

## 규칙

1. **색 값은 `src/styles/tokens`의 CSS에만 있다.** `colors.css`가 원시색, `semantic.css`가 의미 토큰이다. JS·TS 파일에 hex를 적지 않는다.
2. **정적인 스타일은 `className`으로 쓴다.** `bg-background`·`text-muted-foreground`처럼 의미 토큰 클래스만 쓴다. 원시색 클래스(`bg-gray-200`)는 컴포넌트에 쓰지 않는다.
3. **`className`을 못 받는 곳은 `useColors()`로 읽는다.** SVG `fill`, 로띠 `colorFilters`, Reanimated 스타일, 라이브러리 색 프롭이 여기에 든다. 훅 하나가 토큰 전부를 구독 하나로 읽고 테마를 따라간다.
4. **테마는 항상 지원된다.** `semantic.css`의 `@variant dark` 블록이 의미 토큰 값을 바꾼다. 화면 코드에 `dark:`를 쓰지 않는다. 다크 디자인이 없는 앱도 dark 블록을 비워 두지 않는다. 임시 팔레트를 채우고 노출은 `app.config.ts`의 `userInterfaceStyle`로 정한다.
5. **토큰 블록은 `@theme static`이다.** 일반 `@theme`는 `className`에서 안 쓴 변수를 빌드에서 빼므로 JS에서만 읽는 색이 사라진다.

```tsx
<View className="bg-background" />

const colors = useColors();
<Path fill={colors.foreground} />
<Animated.View style={[styles.track, { backgroundColor: checked ? colors.foreground : colors.disabled }]} />
```

움직이는 부분은 `StyleSheet.create` 대신 Reanimated의 `css.create`로 전환 속성만 갖고, 색은 `useColors()` 값을 인라인으로 준다.

## 파일

```
src/styles/tokens/colors.css      @theme static — 원시색
src/styles/tokens/semantic.css    @theme static — 의미 토큰 등록 + light 값
                                  @layer theme { :root { @variant dark { … } } } — dark 값
src/lib/theme/use-colors.ts       useColors() — TOKENS 표 하나, useCSSVariable 배열 읽기
src/lib/theme/use-colors.test.ts  이름 검증
```

```ts
// src/lib/theme/use-colors.ts
import { useMemo } from 'react';
import { useCSSVariable } from 'uniwind';

// className 을 못 받는 곳(SVG·로띠·Reanimated 스타일)에서 쓰는 색. CSS 토큰을 읽고 테마를 따라간다.
const TOKENS = {
  background: '--color-background',
  foreground: '--color-foreground',
  border: '--color-border',
} as const;

export type ColorName = keyof typeof TOKENS;
export type Colors = Readonly<Record<ColorName, string>>;

const NAMES = Object.keys(TOKENS) as ColorName[];
const VARIABLES = NAMES.map(name => TOKENS[name]);

export function useColors(): Colors {
  const values = useCSSVariable(VARIABLES);
  return useMemo(
    () => Object.fromEntries(NAMES.map((name, i) => [name, String(values[i])])) as Colors,
    [values]
  );
}
```

## 색을 추가할 때

1. 원시색이면 `colors.css`에 `--color-<이름>: #hex`.
2. 의미 토큰이면 `semantic.css`의 `@theme static`(light)과 `@variant dark` **둘 다**에 원시색 참조로 적는다.
3. JS에서도 쓰면 `use-colors.ts`의 `TOKENS`에 한 줄 추가한다.

## 가드레일

| 무엇을                                | 어디서                     | 막는 것                                                                          |
| ------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| ESLint `no-restricted-syntax` (error) | `eslint.config.js` 끝 블록 | `src`의 hex 리터럴, `use-colors.ts` 밖의 `useCSSVariable`, `getCSSVariable` 전부 |
| `lib/theme/use-colors.test.ts`        | `pnpm test`                | 훅이 읽는 변수 이름 오타, `@theme static` 이탈, light·dark 토큰 집합 불일치      |
| 프롬프트 훅                           | `.claude/hooks/route.mjs`  | 색·테마 작업을 시작할 때 이 문서를 가리킨다                                      |

```js
// eslint.config.js
const HEX_COLOR = {
  selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
  message:
    'hex 색을 직접 적지 않습니다 — className 토큰(bg-primary 등)이나 useColors() 를 쓰세요. 없는 색이면 src/styles/tokens 에 먼저 추가합니다.',
};
const CSS_VARIABLE_READS = [
  {
    selector: "ImportSpecifier[imported.name='useCSSVariable']",
    message: 'CSS 변수는 useColors()(@/lib/theme/use-colors) 로 읽습니다 — 거기에 색을 추가해 쓰세요.',
  },
  {
    selector: "MemberExpression[property.name='getCSSVariable']",
    message: 'getCSSVariable 은 테마 전환을 따라가지 않습니다 — useColors() 를 쓰세요.',
  },
];
/** 템플릿 시절 hex 가 남은 파일. 여기에 추가하지 않는다 — 화면을 바꿀 때 뺀다. */
const LEGACY_HEX_FILES = [/* 예시 화면 — eslint.config.js 참조 */];

// defineConfig 배열 끝. 같은 rule 키를 쓰는 좁은 블록이 넓은 블록을 덮으므로 순서가 중요하다.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': ['error', HEX_COLOR, ...CSS_VARIABLE_READS] },
  },
  {
    files: ['src/lib/theme/use-colors.ts'],
    rules: { 'no-restricted-syntax': ['error', HEX_COLOR, CSS_VARIABLE_READS[1]] },
  },
  {
    files: LEGACY_HEX_FILES,
    rules: { 'no-restricted-syntax': ['error', ...CSS_VARIABLE_READS] },
  },
```

```js
// .claude/hooks/route.mjs ROUTES
{
  re: /색상?|컬러|colou?r|hex|(디자인|색상?|컬러)\s*토큰|design\s*token|테마|theme|다크\s*모드|StyleSheet|css\.create|스타일링|useCSSVariable|getCSSVariable/i,
  say: '색·테마 → 색 값은 `src/styles/tokens` CSS 에만 둔다. 정적인 곳은 className, JS 색은 `useColors()`. 다크는 `semantic.css` 의 dark 블록이 담당하고 화면 코드에 `dark:` 를 쓰지 않는다. hex 직접 기입·생성 스크립트·읽기 한 번 상수는 거부된 대안이다(ESLint error) — `docs/colors-in-js.md`.',
},
```

ESLint 규칙이 살아 있는지 확인하는 테스트(`eslint.config.test.ts`)는 픽스처를 파일로 쓰지 않고 `eslint --stdin --stdin-filename <가상 경로>`로 돌린다. 파일을 `src/`에 만들면 expo-router 타입 재생성과 Metro 리로드가 반복된다(#46).

## 거부된 대안

| 대안                                         | 왜 안 되나                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| hex를 JS에 같이 적기                         | CSS와 어긋나도 아무도 모른다. 대조 테스트는 잡을 뿐 없애지 못한다                                                                                |
| CSS→TS 생성 스크립트                         | 돌리는 걸 잊는 단계가 생긴다                                                                                                                     |
| `@config` + colors.ts (TS가 원본)            | `@config` 색은 유틸리티에 인라인될 뿐 CSS 변수로 안 나와 semantic `var()`가 깨진다(검증됨)                                                       |
| 시작할 때 한 번 읽는 상수 (`getCSSVariable`) | 테마 전환을 따라가지 못한다. 구독을 아끼려는 것이었지만 `className` 컴포넌트마다 이미 같은 리스너(Uniwind `useStyle`)가 붙어 있어 아낄 것이 없다 |
| 컴포넌트마다 `useCSSVariable` 직접 호출      | 필요한 변수를 각자 고르면 구독이 흩어지고 이름 오타를 잡을 곳이 없다. `useColors()` 하나로 모은다                                                |
| JS 쪽 폴백 hex                               | `@theme static`이면 변수가 항상 있다. 폴백은 값이 두 벌 생기는 것이다                                                                            |
| `withUniwind` + `accent-*` (SVG)             | Path마다 래퍼·구독이 붙고 로띠·Skia·워클릿은 해결 못 한다                                                                                        |
| 화면 코드의 `dark:`                          | 토큰이 이미 테마를 바꾼다. 클래스마다 다크를 적으면 팔레트를 바꿀 때 화면 전부를 고친다                                                          |
| Style Dictionary 등 토큰 파이프라인          | 여러 플랫폼에 토큰을 뿌릴 때의 도구. 앱 하나에 색 20개면 과하다                                                                                  |

## 검증

- `pnpm run check-all`.
- 번들: `npx expo export --platform android --no-bytecode --output-dir <임시경로>` 뒤 번들에 `"__uniwind-theme-dark":{"--color-background":…}`(dark 표)와 기본 표의 `"--color-background":…`(light)가 둘 다 있는지 본다.
- jest에서는 Metro 변환이 안 돌아 `useCSSVariable` 값이 비어 있다. 색 값 자체를 검증하는 테스트는 쓸 수 없고 쓸 필요도 없다.
