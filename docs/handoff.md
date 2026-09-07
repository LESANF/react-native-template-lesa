# lesa-expo-template — AI 핸드오프 (A–Z)

> 이 문서 하나로 다른 AI가 이어서 작업할 수 있게 한 단일 컨텍스트 파일.
> 마지막 갱신: 2026-06-25. **세부 결정의 1차 출처는 `docs/decisions.md`** — 충돌 시 decisions.md 우선.
>
> ⚠️ 현재 구현 상태와 남은 작업은 2026-08-26에 다시 감사한
> [`template-completion.md`](./template-completion.md)가 단일 기준이다. 이 문서의
> 버전 번호와 진행 상태, roadmap은 역사 기록이라 최신 코드와 다를 수 있다.

---

## 0. 가장 먼저 읽을 것 (CRITICAL 규칙)

이 규칙들은 코드보다 우선한다. 어기면 사용자가 작업을 되돌린다.

1. **검증 전 커밋 금지.** 흐름은 `빌드 → 사용자가 시뮬레이터에서 직접 확인 → 그제서야 커밋`. 게이트(lint/type-check) green ≠ 완성.
2. **"완성/완료/done"을 내가 선언하지 않는다.** 완성 판정은 사용자 몫. 상태는 항상 **"빌드됨 · 검증 대기"** 로만 보고.
3. **"계속 진행" = 계속 빌드하라는 뜻이지 자동 커밋이 아니다.**
4. **Expo 사실은 전부 expo-mcp 문서로 검증.** 절대 기억/감으로 답하지 않는다. (`expo-mcp`는 mandatory, 끄지 말 것)
5. **결정적 생성만.** 토큰·값을 손으로 옮겨 적지 않는다 — 파일 복사(`cp`)/스크립트로 100% 재현. (예: 로띠 JSON은 jp에서 `cp` + `diff` 검증)
6. **느리게, 태스크 단위로.** 한 번에 여러 시스템 묶지 말 것. 컴포넌트 이식은 인벤토리 뽑아 **사용자 검증받고 하나씩**.
7. **SDK 55 고정.** SDK 56 금지. `newArchEnabled` 추가 금지(55는 기본 New Arch). `ios/`·`android/` 커밋 금지(CNG). 네이티브 라이브러리는 `npx expo install`, 순수 JS는 `pnpm add`. 의존성 점검은 `npx expo install --fix` + `npx expo-doctor`.

관련 메모리(사용자 글로벌): `verify-before-commit` · `use-expo-mcp` · `deterministic-generation` · `native-tabs-folder-needs-layout`.

---

## 1. 프로젝트 정체성

- **이름/레포**: `lesa-expo-template` → GitHub `LESANF/react-native-template-lesa` (private)
- **정체**: 개인용·의견 강한(opinionated) **Expo SDK 55 / pnpm / CNG-first** RN 템플릿.
- **목표**: 회사 프로덕션 앱(참조 앱 JP, 이하 **jp**)과 obytes 템플릿을 벤치마크하되 **그대로 복사 X, 개선해서 이식**. 최종적으로 `create-my-stack` CLI 래퍼로 `npx create-my-stack MyApp` 한 방 생성까지(#21).
- **버저닝**: 버전은 git **태그**로, 개발은 `1.0.0` 브랜치(현재 브랜치는 `git branch`로 확인). main 브랜치 = `main`.

---

## 2. 기술 스택 (현재)

- Expo **SDK 55** (`expo ~55.0.26`), **expo-router ~55.0.16**, **NativeTabs**(`expo-router/unstable-native-tabs`)
- React **19.2.0**, React Native **0.83.6** (New Arch)
- 스타일: **uniwind ^1.9.0**(Tailwind v4 바인딩) + **tailwind-variants(`tv`)** + **tailwind-merge**. 디자인 토큰은 CSS `@theme` + light/dark.
- 상태/저장: **react-native-mmkv ^4.3.1**
- i18n: **i18next / react-i18next** (이미 셋업됨 — `src/lib/i18n`)
- 에러 경계: **@suspensive/react ^3.21.2** (Toss)
- 애니/제스처: react-native-reanimated 4.2.1, react-native-gesture-handler, react-native-safe-area-context ~5.6.2, react-native-screens
- 이미지: **expo-image ~55.0.11** / 블러: **@react-native-community/blur ^4.4.1** / 로딩 애니: **lottie-react-native 7.3.8**
- 패키지매니저: **pnpm@10.29.3** (only-allow pnpm, `pnpm-lock.yaml`만)
- 게이트: `pnpm run check-all` = `lint && type-check`

---

## 3. 벤치마크 레퍼런스 (로컬 경로)

- **jp (프로덕션 앱, 최우선 참고)**: `(로컬 경로)/참조 앱/참조 앱 JP/참조 앱 JP` — **CodeGraph 인덱싱됨**(codegraph_* 툴 사용 가능). 단, jp 것은 **앱 특화/개선 여지** 많음. "그대로 가져오지 말고 개선해서."
- **obytes 클론**: `(로컬 경로)/react-native-template-obytes` — 스캐폴딩/규율 벤치마크.
- 사용 원칙: jp/obytes에서 **읽고 검증한 뒤** 우리 토큰/규칙으로 다시 짠다. (예: jp pressable은 pull-to-refresh 결합이라 안 가져옴 / jp image는 자사 CDN 종속이라 CDN 부분 제외)

---

## 4. 아키텍처 & 컨벤션 (결정됨 — 1차 출처 decisions.md)

### 4.1 앱 셸 — 루트 `_layout.tsx`는 "조립만"
4분리:
- **동기 모듈로드 셋업** (React 이전 1회): `import '../global.css'`, `import '@/lib/i18n'`, `loadSelectedTheme()` — `_layout` 상단에 인라인.
- **감싸는 것** → `providers/app-providers.tsx` (GestureHandlerRootView → SafeAreaProvider → ThemeProvider → Suspensive ErrorBoundary). 명시적 중첩(composeProviders 거부).
- **네비게이션** → 루트 `<Stack screenOptions={{ headerShown: false }} />` (빈 몸통).
- **띄우는 것** → `providers/global-overlays.tsx` (현재 toast 전역 호스트 — 나중에 필요한 전역 host 추가 자리).

### 4.2 스타트업 2층
① 동기 모듈로드(위) vs ② 비동기 프리로더(`lib/preloader`, **#22 구현됨** — `docs/boot.md`: hydrate→forced-update→OTA(hot-updater)→permissions, splash 라우트, 딥링크 큐). 둘을 섞지 말 것.

### 4.3 라우팅 (expo-router, 검증됨)
- 라우트는 **파일시스템에서 자동 등록.** `<Stack.Screen>`은 **옵션 바꿀 때만** 적는다(옵션 없으면 생략 — 루트는 빈 `<Stack/>`).
- **섹션 = 괄호 없는 일반 폴더** (`shop/`, `shop/[id]`). URL에 나옴.
- **`(group)`은 URL 세그먼트를 숨길 때만** (예: `(tabs)`). 남발 금지.
- 폴더에 `_layout` + `<Stack>`은 **그 폴더가 push(더 깊은 화면)나 헤더가 필요할 때만.** 최소형 `export default Stack` 또는 `<Stack screenOptions={{ headerShown:false }} />`.
- **헤더 기본 off** (탭 내부 스택 전부 `headerShown:false`). 필요한 화면만 opt-in.
- ⚠️ **NativeTabs 폴더-탭은 `_layout.tsx`가 없으면 조용히 드랍됨**(메모리 `native-tabs-folder-needs-layout`). 탭 변경은 fast-refresh 안 먹고 풀 재시작 필요. `sf=` 심볼 틀리면 탭 통째로 사라짐.

### 4.4 네비게이션 (router vs Link) — 확정
- **이동 명령은 `router` 싱글톤으로 통일** (`import { router } from 'expo-router'`). `useRouter()` 훅 안 씀(웹 SSR 할 때만 예외). 둘 다 같은 API·같은 경로, 차이는 호출 위치뿐.
- **경로/파라미터 읽기는 훅** (`usePathname`, `useLocalSearchParams`) — 선택지 없음.
- **Link는 네이티브에서 거의 안 씀.** 평범한 탭 이동은 `onPress={() => router.push(...)}`. Link는 **prefetch / iOS 롱프레스 프리뷰·컨텍스트메뉴·줌**이 필요한 특정 지점만(`<Link asChild>`).
- **리스트→상세 prefetch는 react-query 데이터 prefetch**(`placeholderData` 시드 + `onPressIn`에서 그 항목만 `prefetchQuery`). `<Link prefetch>`는 화면을 통째로 마운트하므로 **무한스크롤 리스트엔 쓰지 말 것.**

### 4.5 모달 / 오버레이
- **라우트 모달**(`presentation`)은 **네비게이션 플로우**(로그인 등 — jp는 `auth`를 fullScreenModal 라우트로)에만.
- **일반 팝업/다이얼로그/토스트 = 명령형 전역 핸들링** (global-overlays 슬롯). 현재는 toast만 `stores/overlay`가 상태/명령을 갖고 `GlobalOverlays`가 호스트만 마운트한다. **overlay-kit은 이 프로젝트에서 금지** — 설치/도입/검토하지 않는다. `Dimmed`는 store에 묶지 않고 필요한 popup/loading/sheet가 직접 렌더하는 공통 primitive로 둔다.
- 데모용 `app/modal.tsx` 라우트 모달은 제거됨.

### 4.6 디자인 토큰 / 다크모드 (Obytes 5레이어 이식, 완료)
- 색 등록·라이트 기본값: `src/styles/tokens/colors.css` (`@theme`, **공식 11 토큰**: background/foreground/card/muted/muted-foreground/primary/primary-foreground/success/warning/destructive/border).
- 다크 오버라이드: `src/styles/tokens/semantic.css` (`@variant light/dark`).
- **화면 코드엔 `dark:` 안 씀.** 시멘틱 토큰(역할 이름)만 쓰고 색은 토큰이 자동 전환.
- JS에서 색 필요하면 uniwind 메커니즘(예: TextInput의 `placeholderTextColorClassName`)으로 — **hex 하드코딩 금지**(결정적 생성 규칙).
- 테마 선택/지속: `src/lib/theme/selected-theme.ts` (`COLOR_SCHEMES = light|dark|system`, MMKV 지속, `loadSelectedTheme()`/`useSelectedTheme()`).

### 4.7 배럴 & 트리쉐이킹 (중요)
- **Metro/Expo SDK 55는 import/export 트리쉐이킹 안 함** → 무거운 *옵션* 라이브러리를 배럴로 re-export하면 번들에 박힘.
- **허용된 배럴은 `src/components/ui/index.ts` 하나.** features/lib/hooks/utils에 index.ts 배럴 금지 → 전체 경로 직접 import.
- **RN 코어 프리미티브 re-export는 허용**: 코어는 어차피 번들에 있어 무게 0 + Expo 기본 `inlineRequires`로 평가도 지연됨. (그래서 `@/components/ui`에서 View/ScrollView도 내보낼 수 있음 — 5.8 참고)
- components/ui 내부 형제 파일끼리는 **`./text`처럼 직접 import**(배럴 경유 X — 순환참조 방지).

### 4.8 components/ui = 모든 UI의 단일 출처 (규칙)
- feature/화면에서 **`react-native`의 시각 UI 프리미티브를 직접 import 하지 않는다** → 전부 `@/components/ui`에서. (ESLint `no-restricted-imports`로 강제 예정)
- ✅ **구현됨**: `@/components/ui` 배럴에 **RN 시각 프리미티브 re-export + `SafeAreaView = withUniwind(...)` + `StyledSvg = withUniwind(Svg)`** 추가. 노출 목록: `View·ScrollView·FlatList·SectionList·ActivityIndicator·useWindowDimensions·StyledSvg`. 타입은 배럴에 넣지 않고 필요한 파일에서 원 패키지(`react-native`, `react-native-safe-area-context`, `react-native-svg`)로 `import type` 한다. **제외**: 우리 버전 있는 것(Text/TextInput/Image/Pressable/Button), `Platform`(Expo platform shaking 때문에 사용 파일에서 `react-native` 직접 import), Dimensions/Keyboard/Linking/Share/AppState(시스템 API라 UI 단일 출처 범위 밖), TouchableOpacity(→ 우리 Pressable), Animated/Easing(→ Reanimated 우선).
- SVG 설정: `react-native-svg`는 SDK 55 번들 버전으로 설치, `.svg` 파일 import는 `react-native-svg-transformer` + `metro.config.js`의 `assetExts/sourceExts` 설정 + `src/types/svg.d.ts`로 처리. **app.config.ts 플러그인 아님.**

### 4.9 utils
- `src/utils/` = **flat 파일 + 직접 import, 배럴 없음.** `cn`은 안 만듦(`tailwind-variants`의 `cn` 사용).

### 4.10 env / app.config (초기 결정 — 유효)
- `env.ts`(루트, public-safe만: APP_ENV 해석, 식별자 파생, `EXPO_PUBLIC_*`, zod 검증) ↔ `app.config.ts`(env.ts를 tsx로 import, 빌드 전용/비밀값은 여기서 `process.env` 직접).
- **비밀값을 `EXPO_PUBLIC_*`·`expo.extra`·client-import되는 env.ts에 넣지 말 것.** `NODE_ENV`로 앱 환경 스위칭 금지.
- 환경명: `development` / `preview` / `production` (staging 아님). 스크립트는 `cross-env EXPO_PUBLIC_APP_ENV=...`.
- CLI용 식별자 플레이스홀더(나중에 #21): `__APP_NAME__ · __BUNDLE_ID__ · __SLUG__ · __SCHEME__`.

---

## 5. 현재 파일 구조 (src)

```
app/
  _layout.tsx              루트 = 조립 (sync setup + AppProviders + <Stack/> + GlobalOverlays)
  +not-found.tsx           404 (토큰 기반)
  (tabs)/
    _layout.tsx            NativeTabs (index + menu-2~5)
    index.tsx              → home-screen (= 컴포넌트 카탈로그)
    menu-2/ (_layout+index) Reanimated/Worklets 예제 탭 (MOTION)
    menu-3/ (_layout+index+detail)    중첩 스택 탭 데모(push) (STACK)
    menu-4/ (_layout+index+[id])      동적 라우트 탭 데모 (DYNAMIC)
    menu-5/ (_layout+index) Settings 화면(테마 토글) 탭 (SETTINGS)
components/ui/             ★ 유일 배럴(index.ts) — toast/dimmed 포함
  text · button · input · pressable · image · error-fallback
components/icons/          코드형 SVG 컴포넌트(탭 아이콘 등). ui 배럴에 넣지 않음.
constants/                 tabRoutes(순수 route 데이터) · tabs(탭바 visual config)
features/                  home(카탈로그) · menu-2~5 · settings
lib/                       i18n · storage · theme/selected-theme
providers/                 app-providers · global-overlays(toast host)
stores/overlay/            toast 전역 store + 명령 API
styles/tokens/             colors.css(@theme) · semantic.css(light/dark) · typography.css
styles/utilities/          typography.css
utils/                     throttle.ts (배럴 없음)
types/                     css.d.ts
assets/json/               dot-loading-white.json (jp에서 cp — Button 로딩 로띠)
```

---

## 6. #14 UI킷 상태

### #14 공통 UI킷 — 컷라인 구현 **빌드됨(게이트 green) · 시뮬 검증 대기**
- **Text**: `tv` variant(display/heading-lg/heading-sm/body-lg/body/label) + color(default/muted/primary/primaryForeground/destructive) + i18n `t()`.
- **Button**: `tv` 슬롯(root/text) · variant(primary 기본/secondary/ghost/link) · size(lg/sm) · disabled/loading · **lottie 로딩**(primary 기준) · **throttle**(더블탭 가드) · a11y. (ControlledInput 같은 RHF 연동은 폼 작업 때)
- **ButtonDock**: 하단 CTA 프레임 — safe-area bottom padding 보정 · border/background 토큰 · optional `shadow` · 자식 버튼은 호출부가 직접 구성.
- **Input**: `tv` 슬롯(root/label/field/errorText) · label/error 내장 · focus 테두리 · disabled · `placeholderTextColorClassName="accent-muted-foreground"`(Uniwind placeholder 색 추출용) · `includeFontPadding:false`. **plain**(RHF ControlledInput은 폼/auth 때).
- **Pressable**: 범용 베이스 — **hitSlop 8 내장** + passthrough. (jp 것은 pull-to-refresh 결합이라 안 씀)
- **Image**: **expo-image 얇은 래퍼** — className(withUniwind) + `Image.prefetch` 노출만. **시각 기본값(placeholder/transition/contentFit/cachePolicy) 강제 안 함**(사용자 요청). (jp의 CDN 리사이즈는 자사 종속이라 제외)
- **Toast/Dimmed**: Toast는 `stores/overlay` 기반 전역 명령 API(`toast.show/hide`) + `providers/global-overlays.tsx` host. 중복 `toast.show()`는 stack하지 않고 새 id로 교체해 enter/timer를 재시작한다. Dimmed는 store 없이 필요한 곳에서 직접 렌더하는 공통 스크림 primitive다. 옵션은 `blur/blurAmount/color/opacity/loader/onPress/children/accessibilityLabel`; `blurAmount`는 `blur: true`일 때만 허용한다. `color`는 alpha 없는 `DimmedColor`(`#...`, `rgb`, `hsl`, `black/white/transparent`)로 좁히고, 투명도는 `opacity`만 담당한다. `loader=true`는 blocking overlay로 보고 backdrop dismiss를 호출하지 않는다. 기본 a11y label은 dismissible `Close`, loader `Loading`.
- **인프라**: ErrorFallback(components/ui), Placeholder(미완성 화면 자리표시 — 이후 제거 대상), `usePreventBack()`(필요 화면에서 Android hardware back/iOS swipe 차단), `useNavigationReset()`(`CommonActions.reset` 기반 root/tab stack reset 베이스), `useDeferredLoading()`(Suspense 밖 loading boolean 지연), `wait(ms = 1000)`(Promise-only timing gap).
- **Examples 카탈로그**: `features/home/home-screen.tsx` = `Section` 헬퍼로 Theme/Text/Button/ButtonDock/Input/Pressable/Image/SVG/Overlays 섹션. ButtonDock은 홈 카드 안 렌더가 아니라 `app/button-dock.tsx` → `features/home/button-dock-example-screen.tsx` 별도 화면에서 하단 고정 상태를 확인.
- UI defer(합의): checkbox · switch · select · radio · popup/dialog/sheet · 웹뷰 · 캐러셀.

### 그 외 포함 범위
컬러 토큰 11개로 경량화, 모션옵션(minimizeBehavior/contentInset) 제거, app/modal.tsx 데모 삭제, 루트 Stack 빈 몸통화, 탭 스택 헤더 off, +not-found/Placeholder 토큰화, throttle util 추가, lottie 에셋 추가, lottie-react-native 설치.

---

## 7. 진행 중 미결 결정 (다음 액션 후보)

1. **ESLint 강제**: feature/route 화면에서 `react-native` 시각 UI 직접 import를 막고 `@/components/ui`로 유도. `Platform` 등 시스템 API는 예외.
2. **decisions.md 갱신**: 배럴/프리미티브 정책은 2026-06-24 반영됨. 라우팅 결론(router 싱글톤 통일 · Link niche · 리스트=react-query prefetch · 모달 전략)은 아직 반영 안 됨.
3. **Navigation reset 검증**: `useNavigationReset()` 베이스는 추가됨. 단일 route reset과 tab stack reset 모두 Expo Router의 `__root` 아래로 감싼다. 훅은 `@/constants/tabs`의 순수 `tabRoutes`만 읽고, `app/(tabs)/_layout.tsx`는 같은 파일의 visual `tabs` config를 렌더한다. 실제 호출은 `_layout` 세션 출구 effect(`resetNavigation('/(tabs)')`)에 붙었다. `__root`는 expo-router 내부값이라 파일 주석에 업그레이드 확인 지점으로 표시됨. 검증 케이스는 `reset('/button-dock')`, `reset('/(tabs)')`, `reset({ tab: 'menu-3', stack: ['index', 'settings'] })`, 동적 라우트 params다.
4. UI킷 마무리 컷라인은 **Text/Button/ButtonDock/Input/Pressable/Image/SVG**로 합의(나머지 defer).

---

## 8. 태스크 전체 (상태 + 순서 + jp 자산 매핑)

완료: #13 앱셸/프로바이더 · #17 다크모드 · #23 bootstrap 인라인화 · #24 죽은코드 제거 · #25 decisions.md 동기화(부분).

진행/예정 (권장 순서):
1. **#14 UI킷** (in-progress) — 컷라인 빌드됨, 사용자 런타임 검증 후 닫기.
2. **#15 데이터 레이어** — axios + react-query + Suspensive. jp `lib/api`(클라이언트) 참고. 에러 정규화는 `lib/api/api-error.ts`(ApiError)로 구현됨. Suspense fallback 지연은 JP `DeferredWrapper`를 가져오지 말고 Suspensive `Delay`를 사용한다. Suspense 밖의 `query.isFetching` 같은 명령형 loading boolean은 이미 추가한 `src/hooks/use-deferred-loading.ts`의 `useDeferredLoading(isLoading, hasData, delayMs)`를 직접 import해서 쓴다.
3. **#16 인증 플로우** — AT/RT 인터셉터·single-flight refresh·세션 출구는 구현됨(`docs/data-layer.md`). 인터셉터는 라우팅하지 않고 `signOut()` 상태 방출만 하며, 화면 전환은 `_layout` 세션 출구 effect(전역 리셋) + 구역 `_layout`의 `<Redirect>` 가드(jp `(tabs)/account/_layout` 방식)로 한다. 로그인 화면·보호 구역·refresh endpoint는 앱 몫(`TODO(앱)`). Input의 ControlledInput(RHF) + zod는 별건.
4. **#22 부팅/프리로더 — 완료(2026-09-03)** `docs/boot.md`. 권한 라이브러리·ATT는 앱 몫(`onPermissions` 주입).
5. **#18 실제 팔레트/타이포 교체 + getting-started 문서.**
6. **#19 테스팅** — 템플릿 기본값에 테스트 인프라를 넣지 않기로 결정(`template-completion.md` A5). 검증은 lint·tsc·Expo Doctor·iOS export·시뮬 확인. 앱이 필요하면 그때 Jest/RNTL을 추가한다.
7. **#20 EAS 빌드 + CI 워크플로.**
8. **#26 버저닝 히스토리** — CHANGELOG + GitHub Releases(라이브러리식, 태그 기반).
9. **#21 create-my-stack CLI** — 마지막. 템플릿 다운로드 + 식별자 치환(`__APP_NAME__` 등) + 의존성 설치 + 클린업. obytes `cli/` 참고.

오버레이 시스템은 현재 toast host/store만 들어감. popup/dialog/sheet는 이후 필요해질 때 store + `GlobalOverlays` 패턴으로 확장한다. 단, `Dimmed` 자체는 store에 넣지 않고 해당 overlay UI가 직접 렌더한다. **overlay-kit은 금지.**

---

## 9. 작업 흐름 & 게이트

- 게이트: `pnpm run check-all` (= `expo lint` + `tsc --noEmit`). 모든 변경 후 green 확인.
- 콜드 빌드 확인 필요시: `npx expo export -p ios` (컴파일 검증).
- **흐름**: jp/obytes 읽기(검증) → 우리 토큰/규칙으로 작성 → 게이트 green → **사용자 시뮬 검증** → 사용자 OK → 커밋.
- lint:fix 자동수정이 동적 className(`p-4${...}`) 깨뜨린 전례 있음 — autofix 후 확인.
- `.codegraph/`·`.omo/`는 생성 인덱스(gitignore) — 건드리지 말 것.

---

## 10. 포인터

- **세부 결정 1차 출처**: `docs/decisions.md` (이 핸드오프보다 상세. 단 이번 세션 결론 일부 미반영 — 7번 참고).
- **사용자 글로벌 메모리**: `(사용자 로컬)/projects/-Users-lesa-Desktop-Repo-lesa-expo-template/memory/` → `MEMORY.md`(인덱스) · `verify-before-commit` · `use-expo-mcp` · `deterministic-generation` · `native-tabs-folder-needs-layout`.
- **사용자 커뮤니케이션**: 한국어. 느리게, 하나씩. 과한 토론·미리 만들기(YAGNI 위반) 싫어함. 리스트 뽑아 검증받고 진행. 틀리면 "추측 말고 검증" 요구.
