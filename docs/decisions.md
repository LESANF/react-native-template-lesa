# Design Decisions

Direction-level decisions agreed during template design discussions.
Each section records: the decision, the reasoning, and what is deferred.

## Styling — Uniwind + design tokens (decided 2026-06-16)

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

## Environment Configuration (decided 2026-06-10)

### Mental model

`.env` means SECRETS, nothing else. The "public env var" concept barely
applies to a client app: anything the client uses is extractable from the
bundle, so client-side "env" is about environment SWITCHING, not secrecy.

| Kind of value | Source | Relation to `.env` |
|---|---|---|
| Environment switch | package.json scripts (`cross-env EXPO_PUBLIC_APP_ENV=...`) | none |
| Per-env public config (API URLs, ids, versions) | code records in `env-candidates.ts` | none |
| Build-time secrets (AWS keys, etc.) | `.env` file | its ONLY use |

`EXPO_PUBLIC_APP_ENV` keeps the prefix for one technical reason only:
Metro inlines `process.env.*` reads into the client bundle by VARIABLE
NAME (static member access, `EXPO_PUBLIC_` prefix required). It is a
transport detail, not a "public env vars" policy.

### File structure (root, flat)

```
.env                 <- secrets only, gitignored. Root-FIXED (Expo CLI
                        only loads .env from project root; moving it
                        would require dotenv, which we rejected).
                        ALWAYS present: `postinstall` copies .env.example
                        when missing, so every clone has the file.
env-candidates.ts    <- per-env candidate values. PURE DATA, zero imports.
                        The only file edited day-to-day. Also the single
                        CLI replacement surface for create-my-stack later.
env.ts               <- defineEnv machinery + `export const Env`.
                        Template-owned, never edited per project.
                        The `@env` alias entry point.
app.config.ts        <- consumes Env; reads secrets DIRECTLY from
                        process.env (no EXPO_PUBLIC_, no extra, no zod
                        ceremony while secret count is small)
```

### The defineEnv mechanism

`env-candidates.ts` holds a nested tree. A leaf shaped exactly
`{ development, preview, production }` is an env record ("candidates");
`defineEnv(values)` in `env.ts` recursively elects the current
environment's value. Static values, arrays, and null pass through.

```ts
// env-candidates.ts (pure data)
export const values = {
  identity: {
    name: 'MyApp',                       // static -> passes through
    bundleId: {                          // candidates -> one is elected
      development: 'com.example.app.development',
      preview: 'com.example.app.preview',
      production: 'com.example.app',
    },
  },
} as const;

// env.ts (machinery)
import { values } from './env-candidates';
export const Env = defineEnv(values);    // Env.identity.bundleId: string
export default Env;
```

This kills the Obytes/참조 앱 triple enumeration (record block + zod
schema + `_env` mapping). Adding a value = one edit in one file.
zod is NOT used for code-sourced values (the type checker already
guarantees them); validation applies only to real process.env reads.

### Safety rules (verified by prototype, 2026-06-10)

A working prototype was built and tested in `.tmp-env-proto/`:

- Recursive type inference passes strict tsc, including type-level
  assertions (env-record leaf -> value union; static/array/null
  passthrough; string/number assignability).
- Runtime verified via tsx (the same loader app.config.ts uses) for all
  three envs, via both ESM import and CJS require paths.
- Malformed records FAIL FAST: a record missing an env key, or carrying
  an extra key, throws at startup with its path (e.g. `Env.urls.api`).
  Invalid `EXPO_PUBLIC_APP_ENV` values throw; unset defaults to
  development.
- Module-order hazards are structurally impossible: `env-candidates.ts`
  imports nothing, so the graph is one-way (`env.ts -> env-candidates.ts`).
  ESM/CJS dependency-first evaluation is deterministic; CI/babel/Metro
  order concerns do not apply.
- The ONLY process.env read on the public side is
  `process.env.EXPO_PUBLIC_APP_ENV` in env.ts (static member access) —
  the identical mechanism the 참조 앱 production app already relies on.
  Final Metro confirmation happens at implementation via
  `expo config --type public` x3 envs + the strict env summary log.

### Secrets policy

- Secrets live in `.env` WITHOUT the `EXPO_PUBLIC_` prefix (Metro never
  bundles them) using the `APP_BUILD_ONLY_*` naming convention.
- app.config.ts reads them ONLY through `requireInStrict(key)`: throws when
  `STRICT_ENV_VALIDATION=1` (prebuild/CI) and the key is missing, warns and
  continues with "" in everyday dev. The template ships one live placeholder,
  `APP_BUILD_ONLY_EXAMPLE_SECRET`, read by app.config.ts and shown masked in the
  strict summary — so the read path is exercised, never dead. Replace it with
  the real secret and pass it to the plugin that needs it (verified 2026-08-27:
  value does not appear in `expo config --type public`).
- Graduation path: if secrets grow past ~5, move them to a dedicated
  `env.build.ts` module (schema + strict CI validation) and block
  `src/**` imports of it via ESLint. The current template uses
  `STRICT_ENV_VALIDATION=1` only to print the JP-style env summary during
  build-oriented commands.
- Never put secrets in `expo.extra` or `EXPO_PUBLIC_*`.
- `.env` is ALWAYS present: `postinstall` copies `.env.example` when missing (verified
  2026-08-27 with and without CI / --frozen-lockfile). Expo CLI parses `.env` with Node's
  `util.parseEnv`, which (Node 23) mis-reads the file's last comment line as a variable if it contains `=` —
  `.env.example` therefore ends with a closing comment that has no `=` at all. Keep it.

### Versions

Per-env version records (app version / iosBuildNumber /
androidVersionCode) stay as candidates in `env-candidates.ts` —
the user prefers explicit record management. Automation (git-count
build numbers, EAS remote autoIncrement) was discussed and parked as
an optional later add-on, not a default.

### Naming decisions

- `defineEnv()` — defineConfig-style idiom; says intent, not mechanism.
  (rejected: byEnv, resolveEnv)
- `env-candidates.ts` — the file IS a collection of per-env candidates
  from which one is elected. Static values are tolerated residents.
  (rejected: env-records, env-values, env-switch, env-resolver, env/ folder)

### Deferred

- `env/` folder split: only if candidates grow very large. Rule when it
  happens: split files are pure data with zero imports; `env.ts` stays
  the sole entry point (aliases/tsconfig unchanged).
- dotenv stays out unless a standalone Node script outside Expo CLI/EAS
  truly needs it.

## Styling (decided 2026-06-10, superseded 2026-06-16)

The original 2026-06-10 styling direction kept tokens in a JS/TS object.
That was superseded by the verified 2026-06-16 decision above:
**CSS `@theme` is the single source of truth**. Do not reintroduce
`colors.ts`, Tailwind `@config` color sources, or duplicated JS/CSS token
records.

Still current from the original decision:

- Use Uniwind as the Tailwind binding.
- Static layout/theme styling uses `className` and component variants.
- Animated values use Reanimated styles, not className animation tricks.

## Folder Structure & Routing (decided 2026-06-11)

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

| Task | Touch | Don't touch |
|---|---|---|
| New screen | features/<domain>/ + 1-line route file in app/ | _layout, providers |
| New domain | create features/<domain>/ | other features |
| Delete domain | delete features/<x>/ + its app/ route files | nothing else breaks |
| New global provider | providers/app-providers.tsx | _layout |
| New global modal/sheet | providers/global-overlays.tsx | _layout |
| New boot logic (push, deep link) | providers/handlers.tsx | _layout |

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

## App Shell · Startup · Routing — finalized (2026-06-17)

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

### Startup = TWO layers (do not conflate — this is why "bootstrap" was wrong)

- ① **Sync module-load** (`app/_layout.tsx` module scope): `global.css`,
  i18n, `loadSelectedTheme`. Runs before React; covers entries that skip the
  splash (deep link / push).
- ② **Async preloader** (`lib/preloader/`, #22): staged pipeline
  (hydrate → forced-update → ota → permissions) + prefetch, behind the splash.
  `preventAutoHideAsync()` in global scope (race-critical: in a hook = too
  late, splash already gone). `hideAsync()` owned by the initializer (app
  enters even on failure). Callbacks injected (DI) = "주입하면 활성화".
  `splash.tsx` = custom preloader route. Modeled on 참조 앱's lib/preloader.
- **Implemented 2026-09-03** — see `docs/boot.md` (single source for boot). OTA engine is
  **hot-updater** (self-hosted, fingerprint strategy) behind an `OtaAdapter` seam; expo-updates
  rejected (both 참조 앱 apps run hot-updater). Deep links: cold → `/splash` + queue hold.
- **Push (2026-09-03)** — see `docs/push.md`. RNFB messaging 26.3.3 (exact) + `react-native-notify-kit`
  FCM Mode (maintained notifee fork; Android data-only, iOS alert + NSE generated by its config plugin).
  Enabled by the presence of `firebase/*.<env>.{plist,json}`; headless side effects live in the root
  `index.js` custom entry (imported before `expo-router/entry`). Permission = react-native-permissions
  in the preloader slot; token sync starts after the preloader. `@notifee/react-native` (archived),
  `@bacons/apple-targets`, expo-notifications rejected.

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
- Root modal = root-level route + `<Stack.Screen presentation:'modal'>` +
  `unstable_settings = { anchor: '(tabs)' }` when a navigable modal needs the
  tab tree as background. Demo `app/modal.tsx` was removed; login later uses
  `presentation:'fullScreenModal'` (#16).
- presentation fixed by purpose: `modal` / `fullScreenModal` /
  `transparentModal` / `formSheet` (native detents, SDK55 — no gorhom needed).
- RN `<Modal>` (standalone overlay) vs router modal screen (navigable) — pick
  by "does it need URL/back/deep-link"; don't mix the two mechanisms.

## Data Layer — current template (updated 2026-08-24)

상세한 설계 근거와 프로젝트별 교체 지점은 [data-layer.md](data-layer.md)를
단일 기준으로 삼는다. 이 절은 현재 구조만 요약한다.

### Structure

```
src/api/<domain>/
  types.ts       Request/Response/Variables 타입
  requests.ts    순수 HTTP 함수
  queries.ts     react-query-kit query 선언
  mutations.ts   react-query-kit mutation 선언

src/lib/api/
  client.ts      단일 axios instance + 외부 client facade
  api-error.ts   전송 실패를 ApiError로 정규화
  query-client.ts
  query-provider.tsx
  react-query-native-listeners.ts

src/lib/auth/
  index.ts             single-flight refresh 오케스트레이션
  refresh-request.ts   앱이 실제 refresh endpoint를 채우는 raw HTTP seam

src/stores/auth-store.ts
  인증 state의 단일 진실원 + MMKV 복원
```

인증 토큰과 일반 설정 모두 MMKV에 둔다(JP와 동일). hydrate는 저장값을 검증하고 깨진
값은 지운다. MMKV가 동기라 렌더 전에 `signedIn | signedOut` 두 상태로 복원되며
hydrating 상태는 두지 않는다. expo-secure-store는 2026-08-26 검토 후 미채택 — 사유는
data-layer.md 거부된 대안.

의존 방향은 `storage → auth-store → lib/auth → client` 단방향이다.
store는 client를 import하지 않으며, 중앙 client의 raw axios instance는 외부에
노출하지 않는다.

### API declarations

- `requests.ts`는 React/TanStack Query를 import하지 않는 순수 HTTP 함수만 둔다.
  query fetcher는 TanStack Query가 주는 `AbortSignal`을 request와 axios까지 전달한다.
- 읽기는 `createQuery`/`createSuspenseQuery`, 쓰기는 `createMutation`으로 선언한다.
  read-only POST도 query에 속한다.
- query key는 factory 선언 안에 한 번만 둔다. 재사용은
  `useXxxQuery.getKey(variables)`로 하고 별도 `query-keys.ts`는 만들지 않는다.
- mutation API 선언은 `mutationFn`까지만 담당한다. invalidate, toast, optimistic
  update 같은 제품 UX는 feature hook에서 조합한다.
- API barrel은 만들지 않는다. `requests|queries|mutations|types` 파일을 직접 import하며
  ESLint가 이 경계를 검사한다.

### Client and auth

- client는 응답의 `data`를 unwrap하므로 request 함수 반환 타입은 `Promise<T>`다.
  `patch`, 성공 응답용 `requestRaw`, endpoint별 선택적 `parse(data: unknown)`도 제공한다.
- 요청 인증은 `auth: 'none' | 'required'`이며 기본값은 `none`이다. `required`만
  요청 시점의 auth-store에서 access token을 읽어 Bearer 헤더를 붙이고, 토큰이
  없으면 네트워크 전에 실패한다.
- 토큰이 실제로 붙었던 요청의 401만 single-flight refresh 후 한 번 재시도한다.
  config의 문자열 마커가 인증 자격과 재시도 횟수를 보존한다.
- refresh adapter가 스텁인 동안 capability는 꺼져 있다. 구현 후 명시적으로 켠다.
- refresh token 누락이나 refresh의 400/401/403만 세션을 끝낸다. 네트워크,
  timeout, 429, 5xx, 취소, 알 수 없는 실패는 세션을 보존한다.
- `ApiError`는 status/code/message/network 여부만 보존하고 Authorization이나 body를
  품을 수 있는 Axios 원본은 노출하지 않는다.
- fresh sign-in은 전달받은 토큰 쌍으로 세션을 완전히 교체한다. refresh 응답이 새
  refresh token을 생략했을 때만 refresh 오케스트레이션이 기존 값을 보존한다.
- refresh HTTP 호출은 중앙 client를 거치지 않는다. 만료 토큰 첨부와 refresh 재진입을
  피하기 위해 raw axios/fetch를 사용한다.
- refresh 도중 로그아웃이나 계정 전환이 일어나면 시작 시점 세션과 비교해 오래된
  성공/실패 결과를 폐기한다.
- 세션 종료 후처리는 `app/_layout.tsx`의 세션 출구 effect 한 곳이다. signedIn→signedOut
  전이를 구독해 `queryClient.clear()`와 내비게이션 리셋을 수행하며, 인터셉터·refresh는
  `signOut()` 상태 방출까지만 한다. 보호 구역은 해당 구역 `_layout`의 `<Redirect>`로 가드한다.

### Deliberately app-owned

템플릿은 실제 refresh endpoint와 응답 shape, 만료 status(기본 401), query retry 정책,
인증 종료 후 reset route를 결정하지 않는다. JSONPlaceholder는 development/preview
시연 전용이며 production의 `.invalid` API 후보는 설정 전 무조건 실패한다. 각 위치의
`TODO(앱)`을 제품 계약에 맞게 채운다.

## Config plugins — 참조 앱(KR/JP) `app.config` 이식 매핑 (2026-09-03)

두 앱의 `plugins`·`ios`·`android` 블록을 항목 단위로 대조했다. 원칙: **두 앱이 같고 앱 정체성과 무관하면 이식**, 마케팅 SDK·브랜드 자산·결제·Analytics 는 제외. 앱 전용 플러그인(`plugins/with-android-plugin.ts`)은 제네릭한 부분만 `plugins/with-plugin.ts`(→ `with-android-plugin.ts` · `with-ios-plugin.ts`) 로 옮겼다.

| KR/JP 항목 | 템플릿 |
|---|---|
| `expo-build-properties.ios.useFrameworks: 'static'` | ✅ 무조건(RNFB 26 SPM 비활성과 짝, docs/push.md) |
| `forceStaticLinking` RNFB 5종 | ⏸ 중복 심볼이 날 때만(문서에 폴백으로) |
| `ios.deploymentTarget: '16.0'` | ❌ SDK 57 기본 16.4 — 낮게 두면 pod 경고/실패 |
| `android.enableProguardInReleaseBuilds` | ✅ |
| `android.usesCleartextTraffic` · `extraMavenRepos`(notifee/naver) | ❌ http API 는 앱 전용 · notify-kit 은 Maven 불필요 |
| `@hot-updater/react-native` `{ channel }` | ✅ |
| `expo-splash-screen`(흰 배경 + 1px, 인트로 영상용) | ↔ 템플릿은 배경색 + 로고(image 는 루트에 — boot.md) |
| `react-native-permissions` Notifications | ✅ |
| RNFB app/messaging | ✅ `firebase/` 파일 존재 게이트 |
| RNFB auth/crashlytics/analytics | ❌ 범위 밖 — 붙일 땐 같은 게이트 안에 |
| `@bacons/apple-targets` NSE | ↔ notify-kit 플러그인이 NSE 생성 |
| `with-android-plugin`: 폴더블(configChanges·resizeableActivity) | ✅ `plugins/with-plugin.ts`(→ `with-android-plugin.ts` · `with-ios-plugin.ts`) |
| `with-android-plugin`: release 서명(Gradle env, production 만) | ✅ 같은 파일. 키스토어 기본 경로 `<repo>/upload.jks`, 값은 `ANDROID_UPLOAD_*` 환경 변수 |
| `with-android-plugin`: 결제 앱 query(`auwallet`) · Analytics 메타데이터 | ❌ 앱 전용 |
| `with-ios-plugin`(KR Airbridge AppDelegate / JP no-op) | ❌ |
| `with-display-name`(KR, Android `app_name` 한글) | ❌ `name` 이 non-ASCII 일 때만 필요 — C3 온보딩에 메모 |
| `expo-dev-client { launchMode: 'most-recent' }` | ❌ SDK 57 플러그인에 그 옵션 없음(자동 적용) |
| `app-icon-badge`(env·버전 배지) | ✅ dev/preview 에서만 |
| `expo-font` Noto KR/JP · `expo-asset { assets }` | ❌ 브랜드 자산 — TODO(앱) |
| `expo-localization` | ❌ 템플릿 i18n 이 쓰지 않음 |
| `expo-tracking-transparency` · `react-native-fbsdk-next` · `airbridge-expo-sdk` · `react-native-channel-plugin` | ❌ 마케팅/앱 전용 |
| `ios.appleTeamId` | ✅ `.env` `APP_BUILD_ONLY_APPLE_TEAM_ID`(선택 — 없으면 Xcode 자동 서명) |
| `ios.associatedDomains` + `android.intentFilters` | ✅ `src/constants/deep-link.ts` 의 `DEEP_LINK_HTTPS_HOSTS` 한 곳에서 파생(비어 있으면 미설정, non-production 은 `?mode=developer`) |
| `aps-environment` · `UIBackgroundModes` · `googleServicesFile` · `POST_NOTIFICATIONS` | ✅ (푸시 게이트) |
| `NSAppTransportSecurity(ArbitraryLoads)` · `LSApplicationQueriesSchemes` · `CFBundleDisplayName` · `NSUserNotificationUsageDescription`(무효 키) · `FirebaseAutomaticScreenReportingEnabled` | ❌ 앱 전용 / 무효 |
| `appStoreUrl` · `playStoreUrl` | ❌ 강제 업데이트 정책(`forced-update.ts` TODO)에서 |
| `owner` · `extra.eas.projectId` | C3 |
| `updates.fallbackToCacheTimeout` · `newArchEnabled` · `web` | ❌ 죽은 설정 / 기본값 / 웹 미지원 |

