# Project Handoff

This repository is being built as `my-stack-template`, a personal Expo / React Native template inspired by `react-native-template-obytes`.

The goal is not to copy Obytes feature-for-feature. The goal is to benchmark its scaffolding machinery and operating discipline:

- a template repository that contains the real Expo app boilerplate
- a separate `create-my-stack` wrapper package later
- one-command project creation: `npx create-my-stack MyApp`
- template download, identifier replacement, dependency install, and cleanup
- CNG-first Expo workflow with no committed `ios/` or `android/`

## Current Baseline

The current project was generated with:

```sh
npx create-expo-app@latest . --template default@sdk-55 --no-install --yes
```

Then dependencies were installed with pnpm.

Current baseline decisions:

- Expo SDK is fixed to SDK 55.
- `expo` is on the SDK 55 line: `~55.0.26`.
- Do not upgrade to SDK 56 while this template is targeting SDK 55.
- Dependency checks must use `npx expo install --fix`.
- Diagnostics must use `npx expo-doctor`.
- Native libraries must be added with `npx expo install <package>`.
- Pure JS libraries may be added with `pnpm add`.
- The package manager is pinned with `packageManager: "pnpm@10.29.3"`.
- `pnpm-lock.yaml` is the only lockfile.
- `/ios` and `/android` are ignored and must not be committed.
- `newArchEnabled` must not be added to config. SDK 55 uses New Architecture as required/default.

## Current Verified State

These checks passed after the initial setup:

```sh
npx expo install --fix
npx expo-doctor
pnpm lint
pnpm type-check
```

Notes:

- `expo-doctor` reported `18/18 checks passed`.
- `expo install --fix` reported dependencies are up to date.
- The default SDK 55 template needed explicit ESLint setup.
- `src/types/css.d.ts` was added because the default template imports `*.module.css` from TypeScript.

## Current Uncommitted Work

Expected current git status includes:

- modified `package.json`
- new `pnpm-lock.yaml`
- new `eslint.config.js`
- new `src/types/css.d.ts`
- new `docs/handoff.md`

Do not assume these are user changes. They were created during initial template setup.

## Obytes Benchmark Source

The benchmark repository is available locally at:

```txt
(로컬 경로)/react-native-template-obytes
```

Important files to inspect before copying patterns:

- `package.json`
- `env.ts`
- `app.config.ts`
- `cli/index.js`
- `cli/setup-project.js`
- `docs/src/content/docs/getting-started/project-structure.mdx`
- `docs/src/content/docs/getting-started/environment-vars-config.mdx`
- `docs/src/content/docs/getting-started/rules-and-conventions.mdx`

Use Obytes as a reference for structure and workflow, not as an exact dependency list.

## Product Direction

The user wants a personal, opinionated template. Do not add Obytes features automatically.

Required skeleton:

- SDK 55
- pnpm
- CNG
- `env.ts`
- `app.config.ts`
- template CLI
- later `create-my-stack` wrapper
- lint/type-check/doctor validation gates

Optional or undecided:

- Husky
- lint-staged
- commitlint
- i18n
- UI kit
- NativeWind/Tailwind
- Zustand
- React Query
- TanStack Form
- Jest
- EAS workflows
- GitHub Actions

The user explicitly said i18n is probably not needed for their projects. Do not add i18n unless requested later.

## Env/App Config Decisions

The next implementation task is `env.ts` plus `app.config.ts`.

Decisions already made:

- Use `env.ts`, not `env.js`.
- Use environment names: `development`, `preview`, `production`.
- Use `preview`, not `staging`, because it aligns with EAS profile/environment naming.
- Use `APP_ENV` / `EXPO_PUBLIC_APP_ENV` style naming unless changed by the user.
- Keep `env.ts` at the project root.
- Avoid excessive file fragmentation.

Important design concern:

- The user dislikes private/build-only values being mixed into an importable `env.ts`.
- Treat root `env.ts` as public-safe app configuration that may be imported by client code.
- Private/build-only values should be read directly in `app.config.ts` from `process.env`, or later moved to a separate build-only module if the surface grows.
- Do not put secrets into Expo `extra`.
- Do not put secrets into `EXPO_PUBLIC_*`.

Recommended boundary:

```txt
env.ts
  public-safe values only
  APP_ENV resolution
  app name/slug/scheme/bundle id/package derivation
  EXPO_PUBLIC_* runtime config
  zod validation

app.config.ts
  imports env.ts through tsx
  builds Expo config
  reads build-only/private process.env values locally if needed
```

`dotenv` policy:

- Do not add `dotenv` by default.
- Expo CLI automatically loads `.env` files for Expo commands.
- Add `dotenv` only later for standalone Node scripts that run outside Expo CLI/EAS and truly need `.env` loading.

## Env/App Config Implementation Shape

Likely dependencies:

```sh
pnpm add zod
pnpm add -D tsx cross-env
```

`zod` is runtime dependency because `env.ts` runs at runtime/build-time.

`tsx` is needed so `app.config.ts` can import `env.ts`:

```ts
import 'tsx/cjs';
```

`cross-env` is for portable package scripts.

Expected scripts later:

```json
{
  "start:development": "cross-env EXPO_PUBLIC_APP_ENV=development expo start",
  "start:preview": "cross-env EXPO_PUBLIC_APP_ENV=preview expo start",
  "start:production": "cross-env EXPO_PUBLIC_APP_ENV=production expo start",
  "prebuild:development": "cross-env EXPO_PUBLIC_APP_ENV=development STRICT_ENV_VALIDATION=1 expo prebuild",
  "prebuild:preview": "cross-env EXPO_PUBLIC_APP_ENV=preview STRICT_ENV_VALIDATION=1 expo prebuild",
  "prebuild:production": "cross-env EXPO_PUBLIC_APP_ENV=production STRICT_ENV_VALIDATION=1 expo prebuild"
}
```

Potential app identifier rules:

```txt
development -> com.example.app.development
preview     -> com.example.app.preview
production  -> com.example.app
```

Potential scheme rules:

```txt
development -> example-app-development
preview     -> example-app-preview
production  -> example-app
```

These identifiers will later need placeholders:

- `__APP_NAME__`
- `__BUNDLE_ID__`
- `__SLUG__`
- `__SCHEME__`

## Main Anti-Patterns To Avoid

- Do not blindly copy Obytes dependencies.
- Do not add i18n unless the user asks.
- Do not mix private secrets into client-importable `env.ts`.
- Do not expose private values through `EXPO_PUBLIC_*`.
- Do not expose private values through `expo.extra`.
- Do not use `NODE_ENV` to switch app environments.
- Do not add `newArchEnabled`.
- Do not run `expo install expo@latest` while SDK 55 is pinned.
- Do not add native libraries without checking New Architecture support.
- Do not commit `ios/` or `android/`.

## Suggested Next Work Order

1. Add `zod`, `tsx`, and `cross-env`.
2. Convert `app.json` to `app.config.ts`.
3. Add root `env.ts` with public-safe validation and identifier derivation.
4. Add environment scripts.
5. Add `.env.example`.
6. Verify:

```sh
npx expo config --type public
npx expo install --fix
npx expo-doctor
pnpm lint
pnpm type-check
```

7. Only after this is stable, decide folder structure and optional libraries.

## Communication Preference

The user wants slow, task-by-task progress. Do not batch many template systems into one large change.

Before adding optional tooling, classify it as:

- required
- optional
- deferred

Then proceed only with the current task's scope.
