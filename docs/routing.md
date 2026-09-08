# 라우팅 · 폴더 구조 · 앱 셸

`app/` · `features/` · `providers/` · 탭 · 모달 · 단방향 import 규칙.
부팅 순서는 `boot.md`, 결정 이력은 `decisions.md`.

## 파일 지도

```
app/
  _layout.tsx           루트 — 조립만(동기 모듈 로드 + Stack + 러너). anchor='splash'
  splash.tsx            프리로더 라우트(한 줄 재export → features/splash)
  (tabs)/               탭 5개. 폴더 탭은 그 폴더에 _layout.tsx 가 있어야 등록된다
  +native-intent.tsx    콜드 딥링크 → /splash 리다이렉트 (boot.md)
  +not-found.tsx        미등록 경로
  dev/                  개발 도구 라우트(__DEV__ 전용)
providers/
  app-providers.tsx     감싸기 — Gesture → SafeArea → Keyboard → Theme → Query
  global-overlays.tsx   띄우기 — popup · toast · net-log FAB (렌더 순서 = z-order)
  deep-link-runner.tsx  헤드리스 — 딥링크 큐 바인딩(QueryProvider 안쪽 필수)
  auth-deferred-runner  로그인 후 보류 딥링크 재생
constants/tab-routes.ts 순수 route 데이터(아이콘 의존 없음 — 헤드리스에서 읽는다)
constants/tabs.ts       아이콘 매핑(SVG·PNG import)
hooks/use-navigation-reset.ts  탭·스택 reset 합성
```

## 채우는 곳 (TODO(앱))

| 어디                                  | 무엇                                                |
| ------------------------------------- | --------------------------------------------------- |
| `app/_layout.tsx` 세션 출구           | 로그아웃 후 리셋 정책(기본은 `/(tabs)`)             |
| `constants/tab-routes.ts` · `tabs.ts` | 탭 구성. 아이콘 교체는 `tabs.ts` 헤더 4단계         |
| `app/auth/login` · `app/external-web` | 딥링크 게이트·외부 웹 라우트 — 아직 없다(`boot.md`) |

## 딥링크 스펙 테이블 — 필드 설명

`src/constants/deep-link.ts` 는 spec 테이블만 들고, 매칭은 `lib/deep-link/matcher.ts` 가 한다.
흐름은 `푸시/Linking url → parser → matcher(DYNAMIC queryDriven → STATIC → EXTERNAL_WEB → DYNAMIC) → gates → navigate`.

**`app.config.ts` 가 이 파일을 import 한다**(유니버설 링크 네이티브 설정 파생) — 런타임 import 를
넣으면 prebuild 가 깨진다. 타입 전용 import 만 허용된다.

### `StaticRoute`

| 필드                |                                                                          |
| ------------------- | ------------------------------------------------------------------------ |
| `appPaths`          | app-scheme 매칭 path. **선행 슬래시 없음** — parser 가 그렇게 정규화한다 |
| `webPaths`          | web-link 매칭 path (parser alias 적용 후). 웹 URL 과 앱 경로가 다를 때   |
| `to`                | Expo Router 라우트                                                       |
| `reset`             | 명시적 stack 합성. 미지정 시 `to` 에서 자동 추론                         |
| `gates`             | 통과 게이트. 로그인 필요하면 `['auth']`                                  |
| `whenAuthenticated` | 인증 시 redirect (KR 예: authRegister → mypage)                          |

`StaticResetSpec` 은 `tab`(활성 base 탭) · `stack`(탭 내부 stack) · `topRoute`(`(tabs)` 위에 쌓을
root-level 라우트).

`to` 만으로 뒤로가기 스택이 안 나오면 `reset` 을 명시한다 — 폴더+index 라우트처럼 등록명이
다를 때 그렇다.

### `DynamicRouteSpec`

| 필드                   |                                                                          |
| ---------------------- | ------------------------------------------------------------------------ |
| `appPattern`           | `'menu-4/:id'` 같은 패턴. `:` = named param, 선행 슬래시 없음            |
| `queryDriven`          | query 기반 매칭. string 단일 또는 `readonly string[]`(배열은 OR)         |
| `toExpoPath`           | matched params + query → expo-router path. native-intent 와 handler 공통 |
| `gates`                | 통과 게이트                                                              |
| `safeFallbackExpoPath` | 게이트·비동기 처리가 끝나기 전 사용자가 볼 화면                          |
| `navigate`             | 이동 자체를 앱이 가져갈 때                                               |

**동적 세그먼트가 있으면 `navigate` 를 직접 주는 편이 안전하다.** 기본 이동은 `toExpoPath` 결과에서
reset 을 추론하는데, 파일 기반 등록명(`[id]`)과 URL 값(`42`)이 달라 external(cold·background·
overlay-tap) 진입에서 미매치할 수 있다. KR 은 라우트마다 명시 reset 을 썼다:

```ts
navigate: (_parsed, entrySource, ctx, { id }) => {
  if (entrySource === 'in-app' || entrySource === 'foreground-tap') {
    ctx.router.push({ pathname: '/(tabs)/menu-4/[id]', params: { id } });
    return;
  }
  ctx.reset({ tab: 'menu-4', stack: ['index', { name: '[id]', params: { id } }] });
};
```

### 상수

| 상수                                   |                                                                                                                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEEP_LINK_HTTPS_HOSTS`                | 유니버설 링크 호스트 화이트리스트. 비면 https 는 전부 `unknown` → noop, 앱 스킴만 동작. 어트리뷰션 SDK 링크 도메인도 여기 — `associatedDomains`·`intentFilters`·native-intent 가 파생된다 |
| `SAFE_REDIRECT_PATH`                   | cold 진입에서 `+native-intent` 가 돌려주는 경로. 실제 이동은 splash 가 닫힌 뒤 dispatcher 가 정하므로 화면을 붙잡아 두기만 한다                                                           |
| `SAFE_FALLBACK_PATH`                   | 매칭 실패·게이트 미통과 시 착지점. `+not-found` 로 빠지는 것보다 낫다                                                                                                                     |
| `HANDLED_TTL_MS`                       | 같은 링크가 여러 source 로 들어올 때의 중복 판정 창. 어트리뷰션 SDK 가 링크를 OS Linking 으로 재전파하면 올려야 한다                                                                      |
| `HANDLED_MAX`                          | 처리 이력 맵 상한. 넘으면 만료분부터 청소                                                                                                                                                 |
| `SPLASH_HANDOFF_DELAY_MS`              | splash → dispatcher 핸드오프 지연. `router.replace` 와 dispatcher reset 충돌 방지                                                                                                         |
| `AUTH_LOGIN_PATH` · `AUTH_ROUTE_GROUP` | auth 게이트가 여는 로그인 화면과 그 라우트 그룹 첫 세그먼트(deferred 재생이 "모달이 닫혔는지" 판단하는 기준)                                                                              |
| `EXTERNAL_WEB_PAGE_PATTERNS`           | 우리 웹 도메인의 마케팅 정적 페이지 — 앱 안에서 단순 웹뷰. 토큰·브릿지 없음. 매칭되면 matcher 가 `/external-web?path=/<path>` 핸들러를 만든다                                             |
| `DEEP_LINK_FALLBACK_ROUTE`             | miss fallback. dispatcher 가 noop 처리하므로 거의 쓰이지 않는다                                                                                                                           |

## 딥링크 런타임 — 타입과 API

### `LinkKind` (parser 가 판별)

|              |                                                     |
| ------------ | --------------------------------------------------- |
| `app-scheme` | `myapp://menu-4/42`                                 |
| `web-link`   | `https://<DEEP_LINK_HTTPS_HOSTS 중 하나>/menu-4/42` |
| `unknown`    | 우리 링크가 아님 → dispatcher noop                  |

### `EntrySource`

`cold` 만 splash 종료를 기다리고 나머지는 즉시 처리된다.

|                  |                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `cold`           | 앱 종료 상태에서 OS 가 링크로 실행                                                                                   |
| `background`     | 앱이 백그라운드에 있다가 링크로 복귀                                                                                 |
| `foreground-tap` | 앱이 떠 있는 상태에서 알림 탭 (푸시 SDK 가 enqueue)                                                                  |
| `in-app`         | 인앱 배너·버튼이 `emitInApp` 으로 발생시킨 링크                                                                      |
| `overlay-tap`    | `(tabs)` 밖 root-level 오버레이(예: 알림 목록)에서 발생. external 과 같은 reset 처리를 받아 뒤로가기 스택이 살아난다 |

### `ResolvedHandler`

matchRoute 가 돌려주는, 그 링크에 고정된 핸들러.

| 필드                   |                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `match`                | 매칭 검증. matchRoute 가 이미 확정하므로 현재는 항상 true                                            |
| `gates`                | 통과해야 하는 게이트                                                                                 |
| `navigate`             | 실제 진입 (reset · push · navigate)                                                                  |
| `name`                 | 로깅·디버깅용                                                                                        |
| `expoPath`             | native-intent 가 돌려줄 경로. **dispatcher 의 이동과 같은 화면으로 수렴해야** `+not-found` 를 피한다 |
| `safeFallbackExpoPath` | 게이트가 있는 라우트의 안전 착지점. splash 가 먼저 이 화면으로 빠져나온 뒤 게이트 UI 가 그 위에 뜬다 |

`GateName` 의 구현은 `lib/deep-link/gates` 의 `GATE_MAP`. 게이트를 추가하면 union 을 넓힌다
(KR: `'auth' | 'verified' | 'marketing' | 'pushPermission'`).

### dispatcher — 큐가 필요한 이유

흐름은 `enqueue → processNextEntry → matchRoute → runGates → handler.navigate`.

1. cold 진입은 네비게이터가 준비되기 전에 도착한다 → splash 가 닫힐 때까지 붙잡아 둔다.
2. 같은 링크가 여러 source(OS Linking · 푸시 · 인앱)로 동시에 들어온다 → 한 번만 처리한다.

`peekColdSafeFallback` 은 큐 첫 cold entry 의 `safeFallbackExpoPath` 를 mutation 없이 본다.
splash → dispatcher 핸드오프에서 밑에 깔 화면을 정하는데, 없으면 미등록 링크로 콜드 진입했을 때
dispatcher 가 noop 하고 splash 에 갇힌다.

|                            |                                         |
| -------------------------- | --------------------------------------- |
| 미등록 라우트              | 안전 경로(홈)                           |
| 등록 + `safeFallback` 지정 | 그 화면 (게이트 UI 가 그 위에 뜬다)     |
| 등록 + 미지정              | `null` — dispatcher 의 이동 흐름 그대로 |

`enqueueOrFallback` 은 매처에 없는 URL 도 최소한의 결과를 보장한다. silent noop 이면 "탭했는데
아무 일도 안 남"이 되기 때문이다. 인앱 호출처(배너·알림 목록 등)가 쓴다.

|                         |                                                                      |
| ----------------------- | -------------------------------------------------------------------- |
| 매처 등록 path          | 정상 enqueue                                                         |
| 우리 도메인 미등록 path | 안전 경로. TODO(앱): KR 은 `/external-web?path=…` 인앱 웹뷰로 보낸다 |
| 외부 도메인             | 시스템 브라우저 (`Linking.openURL`)                                  |
| parse 실패              | noop                                                                 |

`onExternalUrl` 은 어트리뷰션 SDK 등 외부 SDK 콜백으로 들어온 URL 을 받는다(KR 은 Airbridge 의
deeplink 콜백). SDK 는 `entrySource` 를 알려주지 않으므로 splash 상태로 cold/background 를 판별한다.

### 진입 source

어디로 들어오든 최종 목적지는 `dispatcher.enqueue` 하나다.

- **OS Linking** — cold(`getInitialURL`) + background(`url` 이벤트)
- **in-app** — `emitInApp`. 인앱 배너·버튼이 같은 라우팅 규칙을 타게 한다
- **푸시 알림 탭** — `sources.ts` 를 거치지 않는다. `lib/push/background.ts`(headless) 와
  `lib/push/taps.ts`(React 계층)가 `deepLinkDispatcher.enqueue` 로 직접 합류한다

## matcher · parser

### 우선순위

`DYNAMIC queryDriven → STATIC → EXTERNAL_WEB_PAGE → DYNAMIC path-pattern → null`.
Lookup table 은 모듈 로드 시 1회 빌드한다.

### `inferResetFromTo` — `to` → reset 옵션 추론

| `to`                    | reset                                     |
| ----------------------- | ----------------------------------------- |
| `/(tabs)?tab=x`         | 첫 탭 + params                            |
| `/(tabs)`               | 첫 탭                                     |
| `/(tabs)/menu-5`        | `menu-5` 탭                               |
| `/(tabs)/menu-3/detail` | `menu-3` 탭 + nested                      |
| `/whatever`             | `null` — 탭 밖이라 명시 reset 이 필요하다 |

미등록 탭으로 reset 하면 네비게이션이 통째로 실패하므로, `null` 이면 호출부가 `navigate` 로 떨어진다.

### DYNAMIC 핸들러 — KR 이 넣었던 앱 고유 동작

템플릿의 기본 이동은 `toExpoPath` 로 `expoPath` 만 통일하고 일반 규칙으로 처리한다.
KR 은 여기가 라우트 이름별 switch 였고 핸들러마다 다음이 들어 있었다:

- 명시 reset (`topRoute: { name: 'product', nested: [{ name: '[id]', params: { id } }] }`)
- 진입 전 prefetch 검증 후 토스트만 띄우고 중단 (종료된 응모 · 삭제된 게시물)
- 진입 전 스토어 커밋 (검색어·필터를 한 번에 set — 화면 렌더 race 방지)

그런 동작이 필요하면 `DYNAMIC_ROUTES_SPEC` 의 `navigate` 로 라우트마다 넣는다. matcher 의 기본
이동은 손대지 않는다. 기본값은 cold 는 splash 를 replace, 그 외 외부 진입은 navigate, 인앱은 push.

### auth 게이트가 있는 STATIC 의 cold 진입

splash 가 미리 `(tabs)` 로 replace → dispatcher 가 로그인 모달 push → dismiss 하면 `(tabs)`.
이렇게 하지 않으면 splash 위에 모달이 갇힌다. background/foreground 는 `+native-intent` 가
redirect 하고, 게이트 없는 static 은 handler 의 reset 이 덮는다.

### parser

등록 호스트마다 apex + www 두 변형을 모두 매칭한다.

우리 링크가 아니면 `transport: 'unknown'` 으로 돌려준다 — `null` 이 아닌 이유는 호출부가
"파싱 실패"와 "남의 링크"를 구분할 필요가 없기 때문이다. 경로가 없는 우리 링크(bare scheme)는 `null`.

```
myapp://menu-4/42?mode=edit    → { transport: 'app-scheme', path: 'menu-4/42' }
https://example.com/menu-4/42  → { transport: 'web-link',   path: 'menu-4/42' }   (호스트 등록 시)
https://other.com/whatever     → { transport: 'unknown',    path: '' }
```

**`WEB_PATH_ALIASES`** — web path → app canonical, 첫 매칭만 적용. 웹과 앱 URL 이 1:1 이면 비워 둔다.
KR 예:

```ts
[
  /^my-page\/orders\/.+$/,
  'mypage/orders',
] // 상세 ID 를 리스트 path 로 (앱에 상세가 없을 때)
[
  (/^my-page\//, 'mypage/')
] // prefix 치환 — 더 구체적인 규칙 뒤에 둔다
[
  (/^app-download$/, 'raffle')
] // 웹 랜딩 → 앱 화면
[(/^product\//, 'products/')]; // 레거시 단수 path → canonical 복수
```

**query → path** 규칙은 alias 보다 먼저 적용되고, 소비한 query 키는 제거된다. KR 예:

```ts
{ matchPath: p => p === 'wear', queryKey: 'openSliderStyling', toPath: v => `wear/${v}` }
{ matchPath: p => p === 'search/result', queryKey: 'searchKeyword', toPath: v => `search/${v}` }
```

## 확정 결정 — 폴더 구조와 라우팅 (2026-06-11)

### Goal

Developers add/delete inside a designated zone without touching anything
else. This property comes from the unidirectional import rule, not from
the folder picture alone.

### Structure

```
src/
├── app/          # ROUTES ONLY: _layout files (navigator declarations)
│                 # + 1-line re-exports. Nothing else, ever.
├── features/     # 95% of daily work. One folder per domain:
│   └── <domain>/ #   <name>-screen.tsx + components/ + api.ts + store.ts
├── components/   # shared design system (ui/), promoted via Rule of Three
├── providers/    # root assembly, consumed only by app/_layout.tsx:
│   ├── app-providers.tsx   # provider pyramid (evidence: Showtime providers/)
│   ├── global-overlays.tsx # global overlays (evidence: Expensify GlobalModals.tsx)
│   ├── handlers.tsx        # headless boot/runtime handlers
│   │                       # (evidence: Expensify *Handler.tsx vocabulary)
│   ├── bootstrap.ts        # module-top side effects (HotUpdater.init, patches)
│   └── error-boundary.tsx
├── lib/          # infrastructure: api client, auth, deep-link, analytics, logger
├── stores/       # GLOBAL stores, folder-as-module per domain:
│   └── <name>/index.ts  (auth/, overlay/, ...) — see stores rules below
├── hooks/        # shared hooks (feature-specific hooks live in the feature)
├── utils/        # pure functions
└── types/        # shared types
```

Rejected names: app-shell (user), screens/-only layout (Expo blog variant —
weaker domain cohesion for commerce apps), runners (replaced by Expensify's
"handlers" vocabulary).

### Zone recipes

| Task                             | Touch                                          | Don't touch         |
| -------------------------------- | ---------------------------------------------- | ------------------- |
| New screen                       | features/<domain>/ + 1-line route file in app/ | _layout, providers  |
| New domain                       | create features/<domain>/                      | other features      |
| Delete domain                    | delete features/<x>/ + its app/ route files    | nothing else breaks |
| New global provider              | providers/app-providers.tsx                    | _layout             |
| New global modal/sheet           | providers/global-overlays.tsx                  | _layout             |
| New boot logic (push, deep link) | providers/handlers.tsx                         | _layout             |

### Unidirectional imports (ESLint-enforced, bulletproof-react pattern)

```
utils/types → lib → stores → hooks/components → features → app·providers
```

Additional zone (verified 2026-06-11): providers/ may only be consumed by
app/ — features and lib cannot import from providers.

- No reverse imports. No cross-feature imports (compose at app level).
- Layer rules (relaxed again 2026-06-12, user request — "폴더 하나하나
  잡지 말 것"): hierarchy DECLARATION instead of folder enumeration.
  Only the three structural names appear in config:
  ```
  error: src/!(app|features|providers)/** may not import from features
  error: src/!(app)/**                  may not import from providers
  ```
  Every other folder — current or future (i18n/, api/, whatever) — is
  automatically "shared" and auto-covered. Verified: a brand-new
  src/i18n/ folder was caught reverse-importing features with zero
  config changes. Intra-shared ordering (utils→lib→stores) is NOT
  enforced (over-specification, dropped).
- Severity tiers: structural accidents = `error` (the 2 zones above);
  guidance = `warn` (cross-feature coupling, feature barrels, ui deep
  imports). Warn shows in editor/CI output but never blocks. Projects
  wanting strictness flip warn→error locally.
- Cross-feature rule: inside `src/features/**`, `@/features/` absolute
  imports warn (same-feature imports are relative by convention).
  Accepted soft spot: a relative `../other-feature/` import slips past —
  code-review territory.
- This rule is WHY "delete the folder and you're done" works.

### 루트 `_layout` 모듈 스코프 설정

- **Reanimated strict 경고를 `warn` 으로 낮춘다.** shared value 를 렌더 중 읽는 등의 경고가
  개발 중 잡음이 크다. 실제 오류는 여전히 출력된다. 롤백 = 그 블록 제거(기본값 strict).
- **`freezeOnBlur` 전역 활성.** 가려진 화면의 React 리렌더를 동결해 blur 상태 화면이 스택에
  쌓일 때 배경 렌더 비용을 막는다. 타이머는 계속 돌고 렌더만 미뤄지며 복귀 시 자동 해동된다.
  native-stack 은 최상단 "바로 아래" 화면은 의도적으로 동결하지 않으므로(스와이프백 대응)
  **3장 이상 깊이부터 효과가 난다.** 롤백은 그 줄 제거(전역 해제), 화면별 예외는 해당
  `Stack.Screen` 의 `freezeOnBlur: false`.
- **OTA init 은 URL 이 비면 건너뛴다.** KR 은 모듈 스코프에서 무조건 init 하지만 템플릿은
  기본 OTA 서버가 없다.

### app/ rules

- Route files are 1-line re-exports:
  `export { HomeScreen as default } from '@/features/home/home-screen';`
- Params convention (decided 2026-06-11): screens read URL params with
  `useLocalSearchParams` DIRECTLY inside the feature screen, and declare
  per-screen `<Stack.Screen options>` inside the screen body. Route files
  stay 1-line even for dynamic routes.
  REJECTED: the "bridge" variant (route file reads params and passes
  props, keeping screens router-free). Trade accepted knowingly: feature
  screens depend on expo-router, and screen tests mock the router; in
  exchange route files are uniform 1-liners (matches the user's proven
  참조 앱 workflow).
- `_layout.tsx` files own navigator declarations (Stack/Tabs config) — that
  IS routing, so it stays in app/.
- Do NOT enumerate `<Stack.Screen>` for every route. Routes auto-register;
  declare a screen only to set options (e.g. the auth modal). Root _layout
  target: ~20 lines = AppProviders + Stack + GlobalModals + Handlers.
- Route position (URL) and domain ownership are independent:
  app/(tabs)/account/orders.tsx may point to features/order/.

### Auth pattern (validated against 참조 앱 production)

- Login = `app/auth/` group declared on the root Stack with
  `presentation: 'fullScreenModal', animation: 'slide_from_bottom'`.
  Root-level sibling is the structurally correct place for a modal that
  must cover tabs.
- ONE gate entry point: `requireAuth({ intent, onCancel, prompt })` in
  lib/auth/. Unifies what 참조 앱 had as four mechanisms (useAuthGuard,
  showLoginPopup, withAuthRequired HOC, deep-link gates).
  - pending intent queue (generalized from pendingDeepLinkIntent, 60s TTL)
  - AuthIntentHandler in providers/handlers.tsx consumes intents on login
  - login modal explicitly resolves/rejects on dismiss — no focus heuristics
- `Stack.Protected` is NOT the default. Documented reasons:
  no returnTo concept (redirects to anchor), guard flip wipes history
  (dangerous during AT/RT refresh flicker), wrong paradigm for
  action-gated commerce apps. Use it only for hard-wall member-only
  subtrees, documented as an option.

### Error handling

- `app/+not-found.tsx` = navigation-level 404 (unmatched URL/deep link).
  DONE 2026-06-12 (Link home + shared Text). Separate mechanism from
  ErrorBoundary — different trigger (bad URL vs render throw), cannot be
  merged; may share fallback UI.
- ErrorBoundary = render-exception catcher. Library: **Suspensive**
  (`@suspensive/react`, Toss) — chosen for ErrorBoundary + Suspense
  ergonomics. Root ErrorBoundary is wired now; per-route/per-component
  Suspense/ErrorBoundary boundaries are deferred to the data/error phase with
  react-query suspense.
- ErrorBoundary does NOT catch async/event-handler errors — that is
  crash-reporting territory (Sentry, later phase).
- Loading fallback delay: do not port JP's `DeferredWrapper` component. The
  stack already has `@suspensive/react`, whose `Delay` component covers delayed
  fallback / flash-of-loading-state prevention and can be used outside a custom
  wrapper. For non-Suspense loading state, the template provides
  `src/hooks/use-deferred-loading.ts`; import it directly and use
  `useDeferredLoading(isLoading, hasData, delayMs)` for imperative booleans such
  as `query.isFetching`.
- `wait(ms = 1000)` lives in `src/utils/wait.ts` and is Promise-only. Do not
  add callback overloads; callers should write `await wait(80)` so timing gaps
  are visible at the call site.
- Navigation reset is still not fully covered by Expo Router's public
  `router.replace`/`dismissAll` APIs. A `CommonActions.reset` wrapper is a
  normal app-level utility for logout, deep links, payment completion, and
  forced route replacement. The template provides `useNavigationReset`, and the
  hook reads pure tab route names from `tabRoutes` in `@/constants/tabs` so it
  does not depend on tab bar icons. `app/(tabs)/_layout.tsx` renders from the
  visual `tabs` config in the same module. Both
  single-route resets and tab-stack resets are nested under the Expo Router
  `__root` route; verify the shape in the simulator when auth/deep-link/preloader
  flows start calling it.
- `+native-intent.tsx` (deep-link path interception) DEFERRED to the
  deep-link/auth phase (#11) — a no-op stub now is YAGNI.
- `+html.tsx` = web-only (static HTML shell). N/A — web dropped.

### Console/logging

- `babel-plugin-transform-remove-console` in babel env.production with
  `exclude: ['error', 'warn']` — call statements (including arg
  evaluation) removed from production bundles. Standard practice, also in
  RN performance docs. No need to wrap every log in `if (__DEV__)`.
- `if (__DEV__)` / APP_ENV checks are for dev-only CODE BLOCKS (debug
  screens, NetLogFab), which constant-folding + minify strips.
- Template ships a thin `lib/logger.ts` (debug no-ops in prod, error
  routes to crash reporting later). Final required/optional classification
  happens in the tooling phase.

### Remaining conventions (decided 2026-06-11)

- **Overlays — store-owned globals, overlay-kit banned**: local overlays are
  owned by the screen/component when they are local. Global overlays are
  driven by `stores/overlay` and mounted once in `providers/global-overlays.tsx`.
  Current global store/host scope is toast only. Future popup/dialog/sheet work
  may extend this store/host pattern when it truly needs global command APIs.
  `overlay-kit` is not a default, not a later candidate, and must not be
  installed. Dimmed is not store-owned; it is the common scrim primitive that
  popup/loading/sheet components render directly:
  `blur/blurAmount/color/opacity/loader/onPress/children`. `color` uses a
  narrowed alpha-free `DimmedColor` (`#...`, `rgb`, `hsl`,
  `black`/`white`/`transparent`) so Tailwind className strings cannot be passed
  accidentally and opacity has a single owner. Do not add dim color presets
  until the app has a real design-system need for them. `blurAmount` is only
  valid when `blur: true` is set. Blur follows JP's
  `@react-native-community/blur` pattern (`BlurView` with
  `blurType`/`blurAmount`), without root-level blur wrappers. The color scrim is
  a separate layer, so loader/children are not faded by overlay opacity. Dimmed
  has no internal timer/auto-clear; lifecycle is owned by the caller. General
  dim usage can dismiss via `onPress`, while `loader=true` is treated as a
  blocking overlay and must be cleared by the caller's loading state. Back
  prevention is page-owned: screens that must block Android hardware back and
  iOS swipe use the JP-style `usePreventBack()` hook directly, not a Dimmed prop.
- **lib/ name KEPT** after explicitly rejecting: services (wrong flavor),
  core (too abstract), shared (collides with components/hooks also being
  shared), infrastructure (too long), dissolved top-levels (src sprawl).
  Anti-dumping rule: lib modules must not know features (enforced by the
  unidirectional lint anyway).
- **stores/ = top-level, folder-as-module**: `stores/<domain>/index.ts`
  where index.ts IS the implementation (or a bounded index over that
  folder's 2-3 files). Import path stays `@/stores/<domain>` forever.
  This is NOT the banned barrel class: implementation module, bounded,
  near-leaf layer (imports lib only). Feature-PRIVATE UI state may still
  live inside the feature; stores/ is for state shared across domains
  or needed by handlers (auth, overlay).
  Accepted cost: deleting a domain now touches three trees
  (features/x + app/x + stores/x if present) — unidirectional lint keeps
  the deletion safe.
- **features internals — single-file style**: `api.ts` (all
  queries/mutations of the domain in one file), `use-<x>-store.ts` for
  feature-private stores, only `components/` as subfolder. Graduate
  api.ts to an api/ folder only when it grows past ~10 hooks.
- **Tests colocated next to the target**: `login-form.tsx` +
  `login-form.test.tsx`. `__tests__/` folders rejected (orphan-test risk
  when moving files). Jest default testMatch picks both up; colocation
  needs no config.

### Follow-ups parked for later phases

- Expo Atlas (`npx expo-atlas`) bundle inspection as an optional
  verification-gate step.
- Experimental tree shaking: revisit when stable and reanimated-safe.

## 확정 결정 — 앱 셸 (2026-06-17)

Supersedes parts of "Folder Structure & Routing": the providers/ file plan
(global-overlays/handlers/bootstrap/error-boundary) and the overlay/auth
specifics evolved during implementation. Verified in the iOS simulator.

### providers/ — actual (separation by ROLE, no abstraction)

- `app-providers.tsx` — 【감싸는 것】 context providers, EXPLICIT nesting
  (Gesture → SafeArea → Theme → root ErrorBoundary). A `composeProviders`
  (array + reduce) helper was REJECTED: too rigid for providers that break
  the mold (render-prop / conditional / coupled / position-specific).
  Explicit nesting accommodates any shape. Rule: providers ONLY here — no
  sibling components / conditional UI (that mixing is what tangled 참조 앱's
  9-deep pyramid).
- `global-overlays.tsx` — 【띄우는 것】 things mounted after the navigator
  (toasts, global sheets, headless runners). Toast is mounted now;
  future popup/sheet/runner hosts get added here only when they need a global
  command surface. Each component owns its
  implementation, this file only mounts them. Replaces the old
  global-modals.tsx + handlers.tsx split (one slot).
- `bootstrap.ts` REMOVED — sync module-load setup inlined into
  `app/_layout.tsx` module scope (matches 참조 앱/Obytes). The "bootstrap"
  name was dropped as unclear.
- ErrorBoundary = **Suspensive** (`@suspensive/react`, Toss) wired NOW: root
  boundary in app-providers, shared `ErrorFallback` in `components/ui`
  (barrel). Per-screen Suspense/ErrorBoundary + react-query reset comes with
  the data layer (#15).

### (tabs) routing convention (verified in sim)

- Home = `index.tsx` (file, the `/` route). `index` is NOT a reserved file
  like `_layout` — just "default route", freely restructurable.
- Single tab = file OR folder+`_layout`+`index`. Nested tab = folder +
  `_layout`(Stack) + children. Dynamic = `[id].tsx` (`useLocalSearchParams`).
- ⚠️ GOTCHAs (cost real debugging): (a) a NativeTabs **folder** tab WITHOUT a
  `_layout.tsx` is **silently dropped** — folder tabs always need `_layout`.
  (b) tab-structure changes need a **full restart** (not fast refresh) — the
  native tab bar goes stale. (c) an invalid `sf=` SF Symbol name silently
  drops the whole tab.
- Template uses **generic tab names** (menu-2…5) = "replace me" slots; keeps
  one nested-stack example (menu-3/settings) + one dynamic example
  (menu-4/[id]).

### Modal strategy (the "modals tangle" pain)

- WHERE you declare = the scope. Root sibling of `(tabs)` → covers the tab
  bar; inside a tab folder → scoped to that tab.
- Root modal = root-level route + `<Stack.Screen presentation:'modal'>`. The
  root layout's `anchor` is `'splash'` (see "anchor" below) — do NOT flip it to
  `'(tabs)'` for a modal, that skips splash on cold start. A modal needing the
  tab tree as background belongs inside `(tabs)`, or gets its background from
  the stack it is pushed onto. Demo `app/modal.tsx` was removed; login later uses
  `presentation:'fullScreenModal'` (#16).
- presentation fixed by purpose: `modal` / `fullScreenModal` /
  `transparentModal` / `formSheet` (native detents, SDK55 — no gorhom needed).
- RN `<Modal>` (standalone overlay) vs router modal screen (navigable) — pick
  by "does it need URL/back/deep-link"; don't mix the two mechanisms.

### anchor — 루트 레이아웃의 `unstable_settings` 는 Stack prop 과 같은 값이어야 한다 (2026-09-07)

`src/app/_layout.tsx` 는 `export const unstable_settings = { anchor: 'splash' }` 와
`<Stack initialRouteName="splash">` 를 **둘 다** 둔다. 한때 anchor 를 통째로 지웠는데
(사유: `anchor: '(tabs)'` 가 splash 를 건너뛴다) 관찰은 맞았지만 결론이 틀렸다 —
**고칠 것은 값이었지 메커니즘이 아니었다.**

`expo-router` 소스 확인:

- 라우트 노드의 `initialRouteName` 은 **오직** `unstable_settings` 에서만 만들어진다:
  `anchor ?? initialRouteName ?? <group 기본값>` (`getRoutesCore.js:651-676`).
- JSX prop 은 `withLayoutContext.js:117,128` 의 `{...props}` 로 navigator 에만 전달된다.
  그래서 첫 화면 자체는 prop 만으로도 뜬다.
- 하지만 expo-router 자신의 두 경로는 노드 값을 본다:
  자식 정렬 `getSortedChildren(children, order, node?.initialRouteName)`
  (`useScreens.js:131`) 와 딥링크 path→state 랭킹의 `isInitial`
  (`fork/getStateFromPath-forks.js:361`).

anchor 를 빼면 그 둘이 splash 가 첫 화면임을 모른다. 두 값을 **같게** 두는 것이 맞다.
`anchor` 는 SDK 57 이름이고 `initialRouteName` 키도 아직 읽히지만(위 `??` 체인), 새 코드는
`anchor` 를 쓴다.

주의: 루트 anchor 를 `'(tabs)'` 로 바꾸면 콜드 부팅이 splash 를 건너뛴다. 탭 트리를 배경으로
깔아야 하는 모달은 루트 anchor 를 바꾸지 말고 `(tabs)` 안에 두거나, push 되는 스택에서 배경을
얻는다.

검증: 2026-09-07 사용자 Android 빌드·실행에서 앱이 정상 진입했다. 같은 시점에 2026-09-03
의 흰 화면 증상(`_layout.tsx` 청크가 Metro 에 요청조차 되지 않음)도 재현되지 않았다 — 당시
anchor 가 제거된 상태였으므로 이 복원이 유력한 원인이다(확정은 아니다, 그 사이 다른 변경도 있다).

## 거부된 대안 (다시 제안하지 말 것)

- `composeProviders` 추상화 → `app-providers.tsx` 는 명시적 중첩. 순서가 보여야 한다.
- `Stack.Protected` 를 기본 auth 게이트로 → 사유는 위 "Auth pattern"·`data-layer.md`.
- 라우트마다 `<Stack.Screen>` 열거 → 파일시스템 자동 등록. 옵션이 필요한 화면만 적는다.
- 루트 `anchor` 를 `'(tabs)'` 로 (모달 배경용) → 콜드 부팅이 splash 를 건너뛴다.
- `overlay-kit` → `stores/overlay` + `GlobalOverlays` 패턴.
- 전용 로그아웃 훅 파일 → 세션 출구는 `_layout` 한 곳(`data-layer.md`).
- `__tests__/` 폴더 → 테스트는 대상 옆 colocated. 애초에 템플릿은 테스트 인프라를 넣지 않는다.
- 폴더명 `app-shell` · `screens/`-only → 현재 구조로 확정(위 "Structure").
