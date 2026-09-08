# UI · 디자인 시스템

`components/ui` · `styles` · 토큰 · 다크모드 · 배럴 규칙. 결정 이력은 `decisions.md`.

## 파일 지도

```
components/ui/          배럴 진입점(index.ts) — 화면은 여기서만 import 한다
  button · text · input · image · pressable · toast · popup · dimmed
  button-dock · error-fallback · screen-system-bars · net-log-fab(dev)
components/icons/       코드형 SVG(탭 아이콘 등). ui 배럴에 넣지 않는다
styles/tokens/          colors.css(primitive) · semantic.css · typography.css — CSS @theme 이 단일 출처
styles/utilities/       유틸리티 계층
global.css              토큰·유틸리티 진입점. metro 의 cssEntryFile
```

## 채우는 곳 (TODO(앱))

| 어디                                        | 무엇                                                             |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `styles/tokens/colors.css` · `semantic.css` | 브랜드 팔레트. primitive 를 바꾸면 semantic 이 따라온다          |
| `styles/tokens/typography.css`              | 브랜드 타이포. 폰트 파일은 `app.config` `expo-font`(브랜드 자산) |

## 확정 결정 — 스타일링 (2026-06-16)

### Stack

Uniwind (free, MIT) + Tailwind v4 + tailwind-variants + tailwind-merge.
Metro: `withUniwindConfig(config, { cssEntryFile: './src/global.css' })`.
No babel plugin needed. `eslint-plugin-better-tailwindcss` (entryPoint =
global.css) for class validation; `.vscode/settings.json` silences
`@theme` unknown-at-rule warnings + enables tv()/className intellisense.

### 3-layer tokens (coinez/Figma-aligned)

```
src/styles/tokens/colors.css       primitive (@theme --color-gray-500 ...)
src/styles/tokens/semantic.css     semantic  (@theme --color-text-primary: var(--color-gray-900))
src/styles/tokens/typography.css   font size/weight/leading/tracking
src/styles/utilities/typography.css @layer utilities { .text-heading-lg {...} }  (Figma text styles 1:1)
src/global.css                     entry — @import tailwindcss/uniwind + the 4 above
```

### Single source of truth = CSS `@theme` (NOT a JS object)

VERIFIED the hard way (2026-06-16): a JS `colors.ts` fed via Tailwind
`@config` does NOT work for a semantic design system. Tailwind v4
`@config` colors are inlined into utilities (`bg-brand-500` → hex) but are
NOT emitted as CSS variables, so `semantic.css`'s `var(--color-brand-600)`
resolves to nothing → semantic tokens + dark mode break. Proof: web-export
CSS showed `--color-text-brand: var(--color-brand)` with `--color-brand`
never defined. So colors live in CSS `@theme` (the documented Uniwind way),
which emits both the utility AND the `--color-*` variable that semantic
references and dark mode overrides.

REJECTED paths: `@config` + colors.ts (breaks semantic — proven);
generation script colors.ts→css (custom anti-pattern, user rejected);
Obytes-style duplicate colors.js + @theme (two hand-synced sources).

### Usage rules

- Static styling: ALWAYS `className` / `variant` prop.
  `<Text variant="heading-lg" color="brand">` or
  `className="bg-bg-primary text-text-primary"`.
- Text component: tailwind-variants `tv()` maps variant→utility class,
  color→semantic token. className still works (2-way).
- JS color value (Reanimated color interpolation, Skia, charts — the rare
  exception): `useCSSVariable('--color-...')`. Docs say avoid this hook
  for normal styling — className first, always.

### Verified

type-check + lint + cold-cache production `expo export` (CI path) all
green: exit 0, 0 resolution errors, 0 warnings, bundle produced. Semantic
`var()` chains resolve to real values (confirmed in web-export CSS).

### Status (updated 2026-06-17)

- Dark mode — DONE (2026-06-16). `@variant light` / `@variant dark` in
  semantic.css override the semantic vars (primitive fixed); control via
  Uniwind `setTheme` + MMKV persist (`lib/theme/selected-theme`) + nav
  `ThemeProvider`. Verified in sim (light/dark both). See "App Shell" section.
- Real palette — still a neutral starter (brand orange + gray + system).
  Swap per project/Figma (#18).

## 배럴 · 컴포넌트 승격

### Barrel policy (fact-checked 2026-06-11)

Facts:

- Expo import/export tree shaking is experimental (SDK 52+) and opt-in via
  `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1` +
  `EXPO_UNSTABLE_TREE_SHAKING=1`, production-only. This template does not
  rely on it by default. (docs.expo.dev/guides/tree-shaking)
- Therefore a barrel import still pulls its dependency graph into the bundle
  unless that experimental path is explicitly enabled and verified.
  Callstack's official guide rates "Avoid Barrel Exports" as impact:
  CRITICAL (callstackincubator/agent-skills).
- Platform shaking is per-file: `Platform` must be imported directly from
  `react-native` in the file using `Platform.OS` / `Platform.select`. Do not
  re-export `Platform` from `components/ui`, or platform-only branches will
  not be removed.
- Web intuition does not transfer: Vite/Webpack tree-shake by default,
  Metro does not. This is a design trade (Metro optimizes dev speed).

Policy (differential, cost-proportional):

- ✅ ONE allowed barrel: `components/ui/index.ts` (design system entry).
  Safe because: dependency leaf (no cycles possible), small and
  mostly-all-used (nothing to shake), auto-optimized if experimental
  tree shaking is enabled later.
  Guardrails: no optional heavy library re-exports; heavy components
  (charts, webview, maps, carousels, icons, etc.) are imported directly or
  promoted intentionally later.
- ✅ RN visual primitives are re-exported from `components/ui` to keep
  screen imports consistent: `View`, `ScrollView`, `FlatList`,
  `SectionList`, `ActivityIndicator`, and `useWindowDimensions`. Types are
  not re-exported; import them from their source package with `import type`
  when needed. RN core is already in the app; this is a governance choice,
  not a new dependency.
- ✅ `SafeAreaView = withUniwind(...)` is allowed in `components/ui`
  because `react-native-safe-area-context` is already installed and the
  wrapper gives className support.
- ✅ `StyledSvg = withUniwind(Svg)` is allowed in `components/ui` now that
  `react-native-svg` is installed. `.svg` file imports are handled by
  `react-native-svg-transformer` in `metro.config.js`, not by app.config.
- ❌ Excluded from `components/ui`: `Platform` (platform shaking needs direct
  import), `TouchableOpacity` (use our `Pressable`), `Animated`/`Easing`
  (prefer Reanimated), and app-specific wrappers like WebView.
- ❌ Banned: index.ts barrels in features/**, lib/**, hooks/**
  (screen↔store↔components cycles break HMR), and any barrel
  re-exporting optional external libraries (icons etc. — import directly).
- ESLint enforces both directions: no deep imports into components/ui/*,
  no index.ts in banned zones.

### Component promotion — Rule of Three

Components are born inside a feature. Second usage elsewhere: tolerate
duplication. Third usage: promote to components/ui + add one line to the
barrel. Consumers always import from '@/components/ui', so post-promotion
churn is zero.

## 탭 아이콘 교체 — 4단계

1. `assets/icons/tabs/<name>.svg` 를 넣는다 (32×32 viewBox, 단색 path, `fill="black"`).
2. `pnpm icons:tabs` → `<name>.png/@2x/@3x`(기본색)와 `<name>-selected*`(선택색) 6장이 생성된다.
   NativeTabs(iOS 26·Android)가 이 PNG 쌍을 쓴다. 색은 `scripts/gen-tab-icons.sh` 상단 두 값.
3. `components/icons/tabs.tsx` 에 같은 path 로 SVG 컴포넌트를 추가한다 — NativeTabs 를 못 쓰는
   fallback 커스텀 탭바가 `color` prop 으로 칠한다.
4. `constants/tab-routes.ts` 의 `tabRoutes`(순수 데이터)와 `constants/tabs.ts` 의 `tabs`
   (아이콘 매핑)에 한 줄씩 추가한다.

**폴더 탭은 그 폴더에 `_layout.tsx` 가 있어야 등록된다** — 없으면 조용히 빠진다.

순수 route 데이터를 `tab-routes.ts` 로 분리한 이유: 아이콘 없이 읽어야 하는 곳(딥링크 matcher,
네비게이션 유틸)이 `tabs.ts` 의 SVG·PNG import 를 끌고 오지 않게 하려는 것이다.

## i18n — 단일 언어로 시작해 나중에 다국어로

`src/lib/i18n` 은 `resources` 가 비어 있는 상태로 셋업돼 있다. 그러면 `t('안녕하세요')` 가
`'안녕하세요'` 를 그대로 반환하므로, **화면에는 한국어를 바로 적고 번역 파일은 만들지 않는다.**

```tsx
<Text>{t('안녕하세요')}</Text>
```

다국어가 필요해지는 날 JSX 는 한 줄도 안 바꾼다:

```ts
import en from '@/translations/en.json';
resources: { ko: ..., en: { translation: en } }
// 이후 changeLanguage('en') 하면 같은 <Text> 가 매핑된 영어로 나온다
```

- `USE_DEVICE_LANGUAGE` 를 `true` 로 바꾸면 디바이스 언어를 따라간다(기본 off, 단일 언어면
  켜도 결과가 같다). `expo-localization` 의존성은 이미 있다.
- `keySeparator` · `nsSeparator` 를 `false` 로 둔 이유: 한국어 문장의 `.` `:` 를 중첩키·
  네임스페이스로 오해하지 않게 한다(`'확인.'` 이 깨지지 않게).
- `resources` 에 없는 언어는 `fallbackLng` 가 받는다.

## 거부된 대안 (다시 제안하지 말 것)

- 토큰을 JS 객체로 → CSS `@theme` 이 단일 출처. Tailwind v4 의 `@config` 는 semantic 계층에
  동작하지 않는다(위 "Single source of truth").
- `colors.ts → css` 생성 스크립트 → 커스텀 안티패턴, 사용자 거부.
- 우리 버전의 프리미티브 재작성 → `components/ui` 배럴이 RN 시각 프리미티브를 re-export 한다.
- jp `pressable`(pull-to-refresh 결합) · jp `image` CDN 리사이즈 → 자사 종속.

## 검증 상태

`check-all`(lint + tsc) 로 클래스 검증(`eslint-plugin-better-tailwindcss`)까지 돈다.
시감(다크모드 전환·Dimmed blur·토큰 적용)은 시뮬 QA 몫 — `template-completion.md` B1.
