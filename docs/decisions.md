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
                        would require dotenv, which we rejected)
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
  `expo config --type public` x3 envs + runtime Env print.

### Secrets policy

- Secrets live in `.env` WITHOUT the `EXPO_PUBLIC_` prefix (Metro never
  bundles them) using the `APP_BUILD_ONLY_*` naming convention.
- app.config.ts reads them directly via `process.env` with a small
  `requireInStrict()` helper: throw when `STRICT_ENV_VALIDATION=1`
  (prebuild/CI), warn otherwise.
- Graduation path: if secrets grow past ~5, move them to a dedicated
  `env.build.ts` module (zod schema + boot log) and block `src/**`
  imports of it via ESLint. NOT part of the template default.
- Never put secrets in `expo.extra` or `EXPO_PUBLIC_*`.

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

## Styling (decided 2026-06-10)

### Decision

- Use **Uniwind Free (MIT)** as the Tailwind binding. Not NativeWind.
- Animations are handled **separately, case by case**: Reanimated values go
  through `useAnimatedStyle` + the `style` prop, not through className.
- Skia components use their own props (Canvas/Paint), never className.

### Hybrid boundary convention

| Surface | Tool |
|---|---|
| Static layout / theme styling | Uniwind className |
| Animated values | Reanimated `useAnimatedStyle` → `style` prop |
| Canvas / drawing | Skia props + design tokens imported as JS values |

### Token single source of truth

Design tokens (colors, spacing, typography) are defined once as a JS/TS
object and imported by BOTH the Tailwind config and runtime code
(Skia / Reanimated / StyleSheet). This keeps the hybrid surfaces consistent
and limits the swap cost if the styling library ever changes.

### Reasoning

- SDK 55 pinned + stability-first template character.
- NativeWind v5 is still in its stabilization phase per its maintainer
  (official recommended combo was SDK 54 as of June 2026).
- Uniwind is run in production by the latest Obytes starter, so migration
  patterns (`withUniwind` metro config, component wrapping) are proven.
- Uniwind Free's missing features (className animations, zero re-render
  ShadowTree updates, `group-active:*`) are Pro-only, but the hybrid
  boundary convention makes className animations unnecessary anyway.

### Known risks

- Uniwind is young with a small community. Mitigated by the token single
  source of truth and the boundary convention, which keep the library
  swappable.

### Deferred

- Actual Uniwind setup, tailwind config, token file design, and component
  conventions happen AFTER env/app.config and folder structure are settled.
- Do not install any styling dependency until that phase starts.

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
│   ├── global-modals.tsx   # global overlays (evidence: Expensify GlobalModals.tsx)
│   ├── handlers.tsx        # headless boot/runtime handlers
│   │                       # (evidence: Expensify *Handler.tsx vocabulary)
│   ├── bootstrap.ts        # module-top side effects (HotUpdater.init, patches)
│   └── error-boundary.tsx
├── lib/          # infrastructure: api client, auth, deep-link, analytics, logger
├── stores/       # GLOBAL zustand stores, folder-as-module per domain:
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
| New global modal/sheet | providers/global-modals.tsx | _layout |
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
- Metro/Expo SDK 55 default has NO import/export tree shaking. It is
  experimental (SDK 52+), behind `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1` +
  `EXPO_UNSTABLE_TREE_SHAKING=1`, production-only, and has open crash
  issues with reanimated (expo#41620) — which this template uses.
  (docs.expo.dev/guides/tree-shaking)
- Therefore a barrel import bundles AND evaluates everything the barrel
  pulls in. Callstack's official guide rates "Avoid Barrel Exports" as
  impact: CRITICAL (callstackincubator/agent-skills).
- Web intuition does not transfer: Vite/Webpack tree-shake by default,
  Metro does not. This is a design trade (Metro optimizes dev speed).

Policy (differential, cost-proportional):
- ✅ ONE allowed barrel: `components/ui/index.ts` (design system entry).
  Safe because: dependency leaf (no cycles possible), small and
  mostly-all-used (nothing to shake), auto-optimized if experimental
  tree shaking is enabled later.
  Guardrails: no external-library re-exports in it; heavy components
  (charts etc.) are imported directly, not via the barrel.
- ❌ Banned: index.ts barrels in features/**, lib/**, hooks/**
  (screen↔store↔components cycles break HMR), and any barrel
  re-exporting external libraries (icons etc. — import directly).
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
  ergonomics, wired together with react-query suspense. DEFERRED to the
  data/error phase (needs the dep + Suspense strategy). Layers when added:
  root + per-route (expo-router named export) + per-component (Suspensive).
- ErrorBoundary does NOT catch async/event-handler errors — that is
  crash-reporting territory (Sentry, later phase).
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

- **Overlays — two tiers, overlay-kit REJECTED**: local overlays are
  owned by the screen (useState / useModal ref); global overlays are
  driven by `stores/overlay` and mounted once in
  providers/global-modals.tsx (`showConfirm()` callable from anywhere).
  overlay-kit's promise-API benefit acknowledged but not worth the
  dependency + context magic; add per-project only if truly needed.
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
(global-modals/handlers/bootstrap/error-boundary) and the overlay/auth
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
  (toasts, global sheets, headless runners). Empty slot now; each component
  lives in its own folder, this file just mounts them. Replaces the old
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
- Root modal = `app/modal.tsx` + `<Stack.Screen presentation:'modal'>` +
  `unstable_settings = { anchor: '(tabs)' }` (deep-link keeps the background,
  no wipe). Login later = `presentation:'fullScreenModal'` (#16).
- presentation fixed by purpose: `modal` / `fullScreenModal` /
  `transparentModal` / `formSheet` (native detents, SDK55 — no gorhom needed).
- RN `<Modal>` (standalone overlay) vs router modal screen (navigable) — pick
  by "does it need URL/back/deep-link"; don't mix the two mechanisms.
