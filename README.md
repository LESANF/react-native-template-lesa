<p align="center">
  <img src="./assets/images/icon-rounded.png" alt="lesa-expo-template" width="128" />
</p>

<h1 align="center">lesa-expo-template</h1>

<p align="center">
  <a href="https://github.com/LESANF/react-native-template-lesa/releases"><img src="https://img.shields.io/github/v/release/LESANF/react-native-template-lesa?include_prereleases&style=flat-square" alt="release" /></a>
  <a href="https://www.npmjs.com/package/create-lesa-app"><img src="https://img.shields.io/npm/dm/create-lesa-app?style=flat-square&color=CB3837&label=created%20with%20cla" alt="downloads" /></a>
  <a href="https://github.com/LESANF/react-native-template-lesa/stargazers"><img src="https://img.shields.io/github/stars/LESANF/react-native-template-lesa?style=flat-square" alt="stars" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/LESANF/react-native-template-lesa?style=flat-square" alt="license" /></a>
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README.ko.md">한국어</a>
</p>

---

> [!WARNING]
> This is an MVP and it is very experimental. Using it is not recommended.
>
> The docs, this README and the code itself can all change substantially.

An opinionated Expo SDK 57 template: routing, boot sequence, push, OTA and deep
links are already wired — and shipped **switched off**. Filling in a file or
dropping in a config turns each one on.

## Quick start

```bash
npx create-lesa-app my-app
cd my-app && pnpm install
pnpm ios:development     # or: pnpm android:development
```

The CLI asks for an app name, a slug when the name is not lowercase ASCII, and
an optional Apple Team ID, then derives every identifier from the slug and makes
the first commit. Cloning this repo directly works too, but then you fill in
`env-candidates.ts` by hand.

> Native modules (NativeTabs among them) mean a **dev client** — Expo Go will
> not run this.

## What's inside

|                                  |                                                                    |
| -------------------------------- | ------------------------------------------------------------------ |
| Expo SDK 57 · RN 0.86 · React 19 | CNG-first — `ios/` and `android/` are build artifacts, not source  |
| expo-router 57                   | file-based routing, NativeTabs with iOS 26 liquid glass            |
| Uniwind 1.11                     | 3-layer design tokens (primitive → semantic → utility) + dark mode |
| TanStack Query 5 · Axios         | explicit auth, MMKV token storage                                  |
| Zustand 5                        | client state — auth and overlays                                   |
| Reanimated 4.5                   | `InsetView` for safe areas, so tab transitions do not jump         |
| hot-updater                      | OTA that is not EAS Update                                         |
| FCM + notify-kit                 | background and killed-state taps routed into one deep-link queue   |
| i18next                          | single-locale projects pass straight through                       |
| ESLint                           | one-way imports, enforced — deleting a folder is the whole removal |

## Injection is activation

Nothing is behind a feature flag. A file or a value **existing** is what turns a
feature on, so there is no state where a flag is on and its key is missing.

| Fill in                                                                        | Turns on                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `firebase/GoogleService-Info.<env>.plist` **and** `google-services.<env>.json` | Push. One without the other throws                                                   |
| `urls.ota` in `env-candidates.ts` + a bucket in `hot-updater.config.ts`        | OTA. Empty means the preloader skips that stage                                      |
| `DEEP_LINK_HTTPS_HOSTS` in `src/constants/deep-link.ts`                        | Universal links — iOS `associatedDomains` and Android `intentFilters` derive from it |
| `lib/deep-link/attribution.ts`                                                 | An attribution SDK. Empty is a no-op                                                 |
| `APP_BUILD_ONLY_APPLE_TEAM_ID` in `.env`                                       | iOS device signing. Empty means Xcode automatic signing                              |
| `eas.json`, or two lines in `app.config.ts`                                    | EAS Build/Submit. Absent means the local build path                                  |

## Make it yours

`create-lesa-app` fills in the identity for you. This is what it touches, and
what is left for you.

### 1. Identity — `env-candidates.ts`

One file. `app.config.ts` and every native setting derive from it.

| Field                                    | What it is                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `identity.name`                          | **Keep it ASCII.** prebuild derives the iOS Xcode project, scheme and `PRODUCT_NAME` from this   |
| `identity.displayName`                   | The home-screen name. Non-ASCII names belong **here**, not in `name`. Empty falls back to `name` |
| `identity.slug`                          | Expo project identifier                                                                          |
| `identity.scheme`                        | Deep-link scheme, per environment                                                                |
| `identity.bundleId` · `identity.package` | iOS bundle id and Android package, per environment                                               |

> A Korean or Japanese `name` makes the iOS project come out as `app` — Expo's
> sanitizer strips every non-word character. Measurements and the reasoning are
> in [`docs/config.md`](./docs/config.md).

### 2. API URL — `urls.api`

Production ships as `.invalid` and **throws on a production boot** until you
replace it. That is deliberate: it stops an unconfigured production build from
going out quietly. Development and preview point at a jsonplaceholder demo.

### 3. Assets — `assets/images/`

`icon.png` (iOS, full-bleed) · `adaptive-icon.png` (Android, with padding) ·
`splash-icon.png`.

Android's adaptive icon keeps the middle 72dp of 108dp and the launcher mask
crops the rest, so a full-bleed image does not belong there — and
`adaptiveIcon.backgroundColor` should match that file's background.

The splash background lives in **two places** — `expo-splash-screen`'s
`backgroundColor` in `app.config.ts` and
`src/features/splash/splash-screen.tsx`. If they disagree, the seam between the
native and JS splash is visible.

Other spots a project fills in: `grep -rn "TODO(앱)" src`, plus the tables in
[`data-layer.md`](./docs/data-layer.md) · [`boot.md`](./docs/boot.md) ·
[`push.md`](./docs/push.md).

## Build and release

Local prebuild and local native builds are the default. No `eas.json` ships, so
EAS is off until you run `eas init` or fill in the two commented lines in
`app.config.ts` — [`docs/config.md`](./docs/config.md) explains why.

```bash
pnpm prebuild:production      # STRICT validation; regenerating native is the default
pnpm ios:release              # expo run:ios --configuration Release
pnpm android:release          # expo run:android --variant release
```

> `prebuild` **deletes and regenerates** the native folders by default
> (`--clean` is a no-op on SDK 57). `pnpm prebuild --no-clean` applies
> incrementally, `-p ios` limits it to one platform.
>
> The `:release` scripts run with `EXPO_PUBLIC_APP_ENV=development`, so the
> network logger is included — they are local release smoke tests, not store
> builds.

- **Android signing** — `plugins/with-android-plugin.ts` injects
  `signingConfigs.release` on production prebuilds only. The values come from
  Gradle-time environment variables (`ANDROID_UPLOAD_KEYSTORE_PATH` and
  friends), not from `.env`.
- **iOS signing** — `APP_BUILD_ONLY_APPLE_TEAM_ID` in `.env`, or Xcode
  automatic signing when it is empty. Store uploads go through Xcode.
- **OTA** — hot-updater runs against your own server and has nothing to do with
  EAS Update (`pnpm ota:deploy:*`, [`docs/boot.md`](./docs/boot.md)).

## `.env`, app config and CNG

- **`.env` holds build-time secrets only** (`APP_BUILD_ONLY_*`). Only
  `requireInStrict()` in `app.config.ts` reads them, and without an
  `EXPO_PUBLIC_` prefix they never reach the client bundle. `pnpm install`
  creates it from `.env.example`; it is not committed.
- **Runtime public values live in `env-candidates.ts`, not `.env`.** The
  package.json scripts inject `EXPO_PUBLIC_APP_ENV`; nothing reads
  `EXPO_PUBLIC_*` directly.
- `prebuild:*` · `ios:*` · `android:*` run with `STRICT_ENV_VALIDATION=1`, so a
  missing secret throws right there with a masked summary.
- **Never edit the native folders.** `ios/` and `android/` are artifacts; the
  next prebuild removes them. Native changes go through a **config plugin**
  (`plugins/`) for generated configuration, or a **local Expo Module**
  (`pnpm create expo-module --local`) when you need Swift or Kotlin. A local
  module's `ios`/`android` folders **do** get committed — `.gitignore` only
  ignores the root-level ones.
- Keep the **last line of `.env.example` a comment without `=`** — Node's
  `util.parseEnv`, which the Expo CLI uses, reads a trailing comment containing
  `=` as a variable.

## Verify

```bash
CI=true pnpm run check-all     # lint → type-check → test
pnpm doctor
```

## Structure

```
src/
  app/          routing only — one-line re-exports into features
  features/     the actual screens, 1:1 with routes
  providers/    root assembly (app-providers wraps / global-overlays mounts)
  components/   ui (the barrel) · icons · navigation
  styles/       the three token layers
  api/          per-domain requests, queries, mutations, types
  lib/          infrastructure — api · auth · preloader · deep-link · push ·
                i18n · navigation · storage · theme
  stores/       client state — auth · overlay
  constants/ hooks/ types/ utils/
```

Imports run one way: `app` → `features` → shared. Going backwards is a lint
error for `providers` and a warning elsewhere, which is what makes deleting a
folder the entire removal.

## Working on this with an AI agent

The rules and mechanisms live in [`AGENTS.md`](./AGENTS.md), and a hook in
`.claude/hooks/route.mjs` surfaces the relevant one as you work — the same
script serves Claude Code and Codex. Claude Code registers the skills and MCP
servers in one step through the [official Expo plugin](https://docs.expo.dev/agents/claude/).

<details>
<summary>MCP servers and skills that help</summary>

**MCP**

|                                                        |                                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [expo](https://docs.expo.dev/mcp/)                     | Reads the SDK 57 docs directly. Answering from memory usually means an older SDK |
| [codegraph](https://github.com/colbymchenry/codegraph) | Symbol and call-graph index — structural questions without grep                  |
| [context7](https://github.com/upstash/context7)        | Third-party library docs                                                         |

**Skills**

|                                                          |                                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `react-native-best-practices`                            | Software Mansion, New Architecture                                                      |
| `animate-expo`                                           | Reanimated · Gesture Handler · haptics. **Not the web-only `animate` / `motion-react`** |
| `hot-updater`                                            | The OTA engine this template uses                                                       |
| `rn-keyboard-handling`                                   | Keyboard avoidance for forms, modals, sheets                                            |
| `expo-dev-client` · `expo-deployment` · `upgrading-expo` | dev client · store releases · SDK upgrades                                              |

None of these are required. `AGENTS.md` records the fallback for each.

</details>

## Docs

|                                              |                                                         |
| -------------------------------------------- | ------------------------------------------------------- |
| [`docs/config.md`](./docs/config.md)         | env, app config, plugins, release procedure             |
| [`docs/boot.md`](./docs/boot.md)             | splash, preloader, OTA, deep links                      |
| [`docs/push.md`](./docs/push.md)             | FCM, the headless chain, taps                           |
| [`docs/routing.md`](./docs/routing.md)       | routes, tabs, modals, overlays                          |
| [`docs/ui.md`](./docs/ui.md)                 | tokens, dark mode, `InsetView`                          |
| [`docs/data-layer.md`](./docs/data-layer.md) | api, auth, query                                        |
| [`docs/decisions.md`](./docs/decisions.md)   | what was decided, and when                              |
| [`MIGRATION.md`](./MIGRATION.md)             | moving an already-generated project to a newer template |

## License

MIT — see [LICENSE](./LICENSE).
