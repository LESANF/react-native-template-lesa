# 색을 JS에서 쓸 때 — CSS 토큰 하나에서 읽는다

> `docs/ui.md` "Single source of truth = CSS `@theme`" 와 같은 결정이다. 이 문서는 그 결정을
> JS 쪽까지 밀어붙인 것이다. carhartt-kr-app 에서 검증한 방식(2026-09-21)을 이 템플릿의 다크 모드에
> 맞게 옮겼다.

## 결정

색 값은 `src/styles/tokens/*.css` 에만 있다. JS 는 값을 복사하지 않고 **변수 이름으로 읽는다**.

| 하려는 것                                           | 쓸 것                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| 한 번 그리고 마는 배경·글자·테두리                  | `className` 토큰 (`bg-primary`, `text-muted-foreground`)                        |
| SVG 채우기, 로띠 `colorFilters`, 라이브러리 색 프롭 | `useCSSVariable(['--color-a', '--color-b'])` — 필요한 변수를 **배열로 한 번에** |
| `css.create`·워클릿처럼 모듈 수준에서 색이 필요     | 테마별 스타일을 둘 다 만들고 `useUniwind().theme` 으로 고른다                   |
| 새 색                                               | `colors.css` 원시색 → `semantic.css` 참조 → 쓰는 쪽                             |

```ts
// 탭 바 — src/components/navigation/tab-button.tsx
const [active, inactive] = useCSSVariable(TAB_BAR_COLOR_VARS);
const color = String(isFocused ? active : inactive);
```

`useCSSVariable` 은 컴포넌트마다 테마 구독 하나를 갖는다. JS 에서 색을 읽는 곳은 탭 바·로띠·SVG
정도라 앱 전체에 몇 곳뿐이고, 그 비용은 잴 수 없다. 대신 다크 전환을 따라간다.

## 토큰 파일 구조

```
colors.css    @theme static — 원시색(--color-gray-200 …) + 의미 토큰 등록·light 기본값
semantic.css  @layer theme  — light / dark 두 벌. 값은 원시색 참조만
```

- **원시색은 `colors.css` 에만 적는다.** 새 앱은 이 값을 브랜드 팔레트로 바꾸고 `semantic.css` 의
  참조만 조정한다. 의미 토큰에 hex 를 바로 적지 않는다.
- **`@theme static`** 이어야 className 에서 안 쓰는 변수도 번들에 남는다. 일반 `@theme` 는 빌드에서
  빼 버려서 JS 에서만 읽는 색이 `undefined` 가 된다. 그래서 JS 쪽에 폴백 hex 를 둘 이유도 없다.

## 라이트 고정 앱으로 만들 때

`userInterfaceStyle: 'light'` 로 고정하고 `semantic.css` 의 `dark` 블록과 `lib/theme/selected-theme.ts`
를 지우는 앱이라면, 값이 한 벌뿐이라 **시작할 때 한 번 읽어 문자열로 들고 있어도 된다**.

```ts
// src/constants/colors.ts — 라이트 고정 앱에서만
import '@/global.css'; // 먼저 평가돼야 변수가 채워진다

import { Uniwind } from 'uniwind';

const read = (name: string) => Uniwind.getCSSVariable(name) as string;
export const colors = {
  foreground: read('--color-foreground'),
  border: read('--color-border'),
} as const;
```

이러면 구독도 리렌더도 없고 워클릿·`css.create` 에서도 그냥 문자열로 쓴다. 그 앱에서는 ESLint 의
`GET_CSS_VARIABLE` 규칙을 `colors.ts` 에서 풀고, 반대로 `useCSSVariable` import 를 막는다.
**다크 모드를 유지하는 앱에서는 이 방식을 쓰지 않는다** — 시작 테마의 값이 고정돼 탭 바만 흰색으로
남는 식의 불일치가 난다. carhartt-kr-app 의 `docs/ui.md` 가 이 변형의 원본이다.

## 가드레일

문서만으로는 에이전트가 "그냥 hex 적으면 되지" 로 땜질하는 것을 못 막는다(확인됨).

- **ESLint** (`eslint.config.js` 끝): `src/**` 에서 hex 리터럴과 `getCSSVariable` 을 error 로 막는다.
  `LEGACY_HEX_FILES` 는 템플릿 시절 hex 가 남은 예시 화면이다. 목록은 줄기만 한다.
- **프롬프트 훅** (`.claude/hooks/route.mjs`): 색·테마 관련 프롬프트에 이 문서를 가리킨다.
- ESLint 규칙이 살아 있는지 확인하는 테스트는 **넣지 않는다**. 픽스처를 `src/` 에 쓰는 순간
  expo-router 타입 재생성과 Metro 리로드가 반복된다(#46). flat config 에 `no-restricted-syntax`
  블록을 추가할 때는 색 가드레일 블록이 파일 끝에 남아 있는지 눈으로 본다.

## 거부된 대안 — 다시 제안하지 않는다

| 대안                                | 왜 안 되나                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| hex 를 JS 에 같이 적기              | CSS 와 어긋나도 아무도 모른다. 대조 테스트를 붙여도 잡을 뿐 없애지 못한다                   |
| CSS→TS 생성 스크립트                | "돌리는 걸 잊는" 단계가 생긴다. 읽어 오면 그 단계가 없다                                    |
| `@config` + colors.ts (TS 가 원본)  | `@config` 색은 유틸리티에 인라인될 뿐 CSS 변수로 안 나와 semantic `var()` 가 깨진다(검증됨) |
| 읽기 한 번 `colors.ts` 를 기본으로  | 다크 전환을 못 따라간다. 라이트 고정 앱에서만(위 절)                                        |
| `withUniwind` + `accent-*` (SVG)    | Path 마다 래퍼·구독이 붙고, 로띠·Skia·워클릿은 해결 못 한다                                 |
| JS 쪽 폴백 hex                      | `@theme static` 이면 변수가 항상 있다. 폴백은 값이 두 벌 생기는 것이다                      |
| Style Dictionary 등 토큰 파이프라인 | 여러 플랫폼에 토큰을 뿌릴 때의 도구. 앱 하나에 색 20개면 과하다                             |
