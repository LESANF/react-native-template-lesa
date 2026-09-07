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

미검증: 소스 근거는 확실하나 **런타임 확인은 시뮬 QA 몫이다**(부팅 경로 변경). C2 흰 화면
블로커와는 별개다 — 그쪽은 `_layout.tsx` 청크가 Metro 에 요청조차 되지 않는 단계라 라우팅
이전의 문제다.

## 거부된 대안 (다시 제안하지 말 것)

- `composeProviders` 추상화 → `app-providers.tsx` 는 명시적 중첩. 순서가 보여야 한다.
- `Stack.Protected` 를 기본 auth 게이트로 → 사유는 위 "Auth pattern"·`data-layer.md`.
- 라우트마다 `<Stack.Screen>` 열거 → 파일시스템 자동 등록. 옵션이 필요한 화면만 적는다.
- 루트 `anchor` 를 `'(tabs)'` 로 (모달 배경용) → 콜드 부팅이 splash 를 건너뛴다.
- `overlay-kit` → `stores/overlay` + `GlobalOverlays` 패턴.
- 전용 로그아웃 훅 파일 → 세션 출구는 `_layout` 한 곳(`data-layer.md`).
- `__tests__/` 폴더 → 테스트는 대상 옆 colocated. 애초에 템플릿은 테스트 인프라를 넣지 않는다.
- 폴더명 `app-shell` · `screens/`-only → 현재 구조로 확정(위 "Structure").
