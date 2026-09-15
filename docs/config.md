# 환경 · 앱 설정 · 네이티브 빌드

`env-candidates.ts` · `env.ts` · `.env` · `app.config.ts` · `plugins/` · CNG · 빌드 스크립트.
identity 교체 절차는 README "Make it yours", 결정 이력은 `decisions.md`.

## 파일 지도

```
env-candidates.ts   환경별 값(identity · urls · version) — 여기만 편집한다
env.ts              defineEnv 기계. 템플릿 소유, 수정 불필요
.env / .env.example 빌드 타임 시크릿(APP_BUILD_ONLY_*). postinstall 이 자동 생성, 커밋 안 됨
app.config.ts       위 값에서 네이티브 설정을 파생. 빌드 시크릿을 읽는 유일한 곳
plugins/
  with-plugin.ts        진입점(app.config 에 이것만 등록)
  with-android-plugin   폴더블 · release 서명(Gradle env) · app_name(표시명)
  with-ios-plugin       Podfile $RNFirebaseDisableSPM
scripts/load-build-env.cjs   CLI 스크립트용 .env 로드(process.loadEnvFile)
hot-updater.config.ts        OTA 배포(S3) — boot.md
```

## 채우는 곳 (TODO(앱))

| 어디                           | 무엇                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| `env-candidates.ts` `identity` | name(ASCII) · displayName(한글) · slug · scheme · bundleId · package |
| `env-candidates.ts` `urls.api` | production 이 `.invalid` 면 부팅 시 throw(의도)                      |
| `env-candidates.ts` `urls.ota` | 비우면 OTA 비활성                                                    |
| `.env`                         | `APP_BUILD_ONLY_APPLE_TEAM_ID` · AWS 키. 예시 시크릿 줄은 지운다     |
| Gradle env                     | `ANDROID_UPLOAD_*` (release 서명)                                    |
| `app.config.ts`                | 브랜드 폰트(`expo-font`) · 에셋                                      |

## 확정 결정 — 환경 설정 (2026-06-10)

### Mental model

`.env` means SECRETS, nothing else. The "public env var" concept barely
applies to a client app: anything the client uses is extractable from the
bundle, so client-side "env" is about environment SWITCHING, not secrecy.

| Kind of value                                   | Source                                                     | Relation to `.env` |
| ----------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| Environment switch                              | package.json scripts (`cross-env EXPO_PUBLIC_APP_ENV=...`) | none               |
| Per-env public config (API URLs, ids, versions) | code records in `env-candidates.ts`                        | none               |
| Build-time secrets (AWS keys, etc.)             | `.env` file                                                | its ONLY use       |

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
    name: 'MyApp', // static -> passes through
    bundleId: {
      // candidates -> one is elected
      development: 'com.example.app.development',
      preview: 'com.example.app.preview',
      production: 'com.example.app',
    },
  },
} as const;

// env.ts (machinery)
import { values } from './env-candidates';
export const Env = defineEnv(values); // Env.identity.bundleId: string
export default Env;
```

This kills the Obytes·참조 앱 triple enumeration (record block + zod
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

## 확정 결정 — Config plugins · 네이티브 (2026-09-03~)

두 앱의 `plugins`·`ios`·`android` 블록을 항목 단위로 대조했다. 원칙: **두 앱이 같고 앱 정체성과 무관하면 이식**, 마케팅 SDK·브랜드 자산·결제·Analytics 는 제외. 앱 전용 플러그인(`plugins/with-android-plugin.ts`)은 제네릭한 부분만 `plugins/with-plugin.ts`(→ `with-android-plugin.ts` · `with-ios-plugin.ts`) 로 옮겼다.

| KR/JP 항목                                                                                                                                                           | 템플릿                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `expo-build-properties.ios.useFrameworks: 'static'`                                                                                                                  | ✅ 무조건(RNFB 26 SPM 비활성과 짝, docs/push.md)                                                                                   |
| `forceStaticLinking` RNFB 5종                                                                                                                                        | ⏸ 중복 심볼이 날 때만(문서에 폴백으로)                                                                                             |
| `ios.deploymentTarget: '16.0'`                                                                                                                                       | ❌ SDK 57 기본 16.4 — 낮게 두면 pod 경고/실패                                                                                      |
| `android.enableProguardInReleaseBuilds`                                                                                                                              | ✅                                                                                                                                 |
| `android.usesCleartextTraffic` · `extraMavenRepos`(notifee/naver)                                                                                                    | ❌ http API 는 앱 전용 · notify-kit 은 Maven 불필요                                                                                |
| `@hot-updater/react-native` `{ channel }`                                                                                                                            | ✅                                                                                                                                 |
| `expo-splash-screen`(흰 배경 + 1px, 인트로 영상용)                                                                                                                   | ↔ 템플릿은 배경색 + 로고(image 는 루트에 — boot.md)                                                                                |
| `react-native-permissions` Notifications                                                                                                                             | ✅                                                                                                                                 |
| RNFB app/messaging                                                                                                                                                   | ✅ `firebase/` 파일 존재 게이트                                                                                                    |
| RNFB auth/crashlytics/analytics                                                                                                                                      | ❌ 범위 밖 — 붙일 땐 같은 게이트 안에                                                                                              |
| `@bacons/apple-targets` NSE                                                                                                                                          | ↔ notify-kit 플러그인이 NSE 생성                                                                                                   |
| `with-android-plugin`: 폴더블(configChanges·resizeableActivity)                                                                                                      | ✅ `plugins/with-plugin.ts`(→ `with-android-plugin.ts` · `with-ios-plugin.ts`)                                                     |
| `with-android-plugin`: release 서명(Gradle env, production 만)                                                                                                       | ✅ 같은 파일. 키스토어 기본 경로 `<repo>/upload.jks`, 값은 `ANDROID_UPLOAD_*` 환경 변수                                            |
| `with-android-plugin`: 결제 앱 query(`auwallet`) · Analytics 메타데이터                                                                                              | ❌ 앱 전용                                                                                                                         |
| `with-ios-plugin`(KR Airbridge AppDelegate / JP no-op)                                                                                                               | ❌                                                                                                                                 |
| `with-display-name`(KR, Android `app_name` 한글) · `ios.infoPlist.CFBundleDisplayName`                                                                               | ✅ `Env.identity.displayName` 한 곳에서 파생 — 비면 Expo 기본(`name`). 아래 "표시명" 절                                            |
| `expo-dev-client { launchMode: 'most-recent' }`                                                                                                                      | ❌ SDK 57 플러그인에 그 옵션 없음(자동 적용)                                                                                       |
| `app-icon-badge`(env·버전 배지)                                                                                                                                      | ✅ dev/preview 에서만                                                                                                              |
| `expo-font` Noto KR/JP · `expo-asset { assets }`                                                                                                                     | ❌ 브랜드 자산 — TODO(앱)                                                                                                          |
| `expo-localization`                                                                                                                                                  | ↔ 의존성은 두고 **기본 off** — `lib/i18n` 의 `USE_DEVICE_LANGUAGE` 를 true 로 바꾸면 디바이스 언어를 따라간다                      |
| `expo-tracking-transparency` · `react-native-fbsdk-next` · `airbridge-expo-sdk` · `react-native-channel-plugin`                                                      | ❌ 마케팅/앱 전용                                                                                                                  |
| `ios.appleTeamId`                                                                                                                                                    | ✅ `.env` `APP_BUILD_ONLY_APPLE_TEAM_ID`(선택 — 없으면 Xcode 자동 서명)                                                            |
| `ios.associatedDomains` + `android.intentFilters`                                                                                                                    | ✅ `src/constants/deep-link.ts` 의 `DEEP_LINK_HTTPS_HOSTS` 한 곳에서 파생(비어 있으면 미설정, non-production 은 `?mode=developer`) |
| `aps-environment` · `UIBackgroundModes` · `googleServicesFile` · `POST_NOTIFICATIONS`                                                                                | ✅ (푸시 게이트)                                                                                                                   |
| `NSAppTransportSecurity(ArbitraryLoads)` · `LSApplicationQueriesSchemes` · `NSUserNotificationUsageDescription`(무효 키) · `FirebaseAutomaticScreenReportingEnabled` | ❌ 앱 전용 / 무효                                                                                                                  |
| `appStoreUrl` · `playStoreUrl`                                                                                                                                       | ❌ 강제 업데이트 정책(`forced-update.ts` TODO)에서                                                                                 |
| `owner` · `extra.eas.projectId`                                                                                                                                      | ⏸ 기본 미연결 — 주석 이음새로 남김. 아래 "EAS" 절                                                                                  |
| `updates.fallbackToCacheTimeout` · `newArchEnabled` · `web`                                                                                                          | ❌ 죽은 설정 / 기본값 / 웹 미지원                                                                                                  |

### 표시명 — `name` 은 ASCII, 홈 화면 이름은 `displayName` (2026-09-07)

한글·일본어 앱 이름을 `name` 에 그대로 넣으면 안 된다. Expo prebuild 가 `name` 에서 iOS
Xcode 프로젝트·스킴·`PRODUCT_NAME` 을 파생하는데, `sanitizedName()`
(`@expo/config-plugins/build/ios/utils/Xcodeproj.js`)이 `/[\W_]+/g` 로 지우고 이 정규식엔
`u` 플래그가 없다 — 한글·가나가 전부 non-word 로 날아간다. 실측:

| `name`                | iOS 프로젝트·스킴  | Android `rootProject.name` |
| --------------------- | ------------------ | -------------------------- |
| `write-your-app-name` | `writeyourappname` | `write-your-app-name`      |
| `레사앱`              | **`app`**          | `레사앱`                   |
| `레사앱 KR`           | **`KR`**           | `레사앱 KR`                |
| `レサアプリ`          | **`app`**          | `レサアプリ`               |

프로젝트가 `app` 이 되면 `xcodebuild -scheme`·Fastlane·EAS 가 전부 `app` 을 잡고,
이름을 바꾸면 sanitize 결과가 달라져 `ios/` 폴더가 갈아엎어진다. Android 는 Gradle 금지
문자에 한글이 없어 그대로 통과하지만, `name` 하나로는 두 요구(ASCII 식별자 / 한글 표시명)를
동시에 만족할 수 없다.

그래서 KR 이 쓴 방식을 이식했다 — **`name` 은 ASCII, 표시명만 따로 주입**:

- `Env.identity.displayName` 한 곳이 소스. 비우면(기본) Expo 기본 동작 그대로다.
- iOS: `app.config.ts` 가 `ios.infoPlist.CFBundleDisplayName` 에 넣는다.
- Android: `plugins/with-android-plugin.ts` 가 `withStringsXml` 로 `app_name` 만 바꾼다.
  Expo 코어 `withName` 이 먼저 `name` 을 쓰고 이 mod 가 나중에 돌아 덮어쓴다
  (mod 는 나중에 등록된 것이 나중에 실행 — `prebuild -p android` 로 확인).
- `rootProject.name` 과 Xcode 프로젝트명은 ASCII `name` 을 유지한다.

검증(2026-09-07, `displayName: '레사앱'`): `strings.xml` `app_name` = `레사앱` ·
`settings.gradle` `rootProject.name` = `write-your-app-name` · `expo config --type prebuild`
의 `CFBundleDisplayName` = `레사앱`.

거부: KR 처럼 `plugins/with-display-name.ts` 를 따로 두는 것 — Android mod 한 개라
`with-android-plugin.ts` 안에 있는 게 맞다(파일 수를 늘릴 이유가 없다).

### EAS — 열어만 둔다 (2026-09-07, 사용자 지시)

**활성화는 파일 존재로 갈린다.** 템플릿은 `eas.json` 을 넣지 않으므로 기본이 미연결이고,
`eas init` 을 돌리거나 `app.config.ts` 의 주석 두 줄(`owner`·`extra.eas.projectId`)을 채우면
붙는다. 푸시가 `firebase/` 파일 존재로, OTA 가 `Env.urls.ota` 빈 값으로 갈리는 것과 같은
관용구다 — 템플릿은 이음새만 두고 정책은 앱이 고른다. 참조 앱 KR/JP 는 쓰지 않는다.

기본(EAS 미연결) 경로:

- **프리빌드** — `pnpm prebuild:<env>` (`expo prebuild`, `STRICT_ENV_VALIDATION=1`. 재생성이 기본 — 아래 "prebuild clean" 절)
- **빌드** — `pnpm ios:release` · `pnpm android:release`
  (`expo run:ios --configuration Release` · `expo run:android --variant release`)
- **Android release 서명** — `plugins/with-android-plugin.ts` 가 production 프리빌드에서만
  `signingConfigs.release` 를 주입하고, 값은 Gradle 실행 시점 env `ANDROID_UPLOAD_*` 에서 읽는다.
  EAS 를 붙이면 EAS credentials 가 자체 signingConfig 를 넣어 이 블록은 쓰이지 않는다.
- **iOS 서명** — `.env` `APP_BUILD_ONLY_APPLE_TEAM_ID` → `ios.appleTeamId`, 비면 Xcode 자동 서명.
  스토어 업로드는 Xcode 또는 앱이 직접 붙이는 fastlane.
- **푸시 NSE** — 기본은 **수동 프로비저닝**(`<bundleId>.NotifyKitNSE` 프로필). EAS 를 붙이면
  `extra.eas.build.experimental.ios.appExtensions` 에 자동 등록된다.
- **Firebase 설정 파일** — 커밋하거나, CI 시크릿 / EAS file 타입 환경 변수로 복원한다.
- **OTA** — hot-updater 자체 서버라 EAS 연결 여부와 무관하다(위 OTA 결정).

**CNG 는 EAS 와 무관하게 그대로다.** EAS 를 안 붙였다고 네이티브를 커밋하는 게 아니다 —
`ios/`·`android/` 는 여전히 산출물이고 `prebuild` 가 `rm -rf` 후 재생성한다. 네이티브가
필요하면 경로는 둘뿐이다:

1. 생성되는 네이티브 **설정**을 바꾸는 것 → **config plugin** (`plugins/`)
2. 네이티브 **코드**가 필요한 것 → **로컬 Expo Module**
   (`pnpm create expo-module --local` → `modules/<name>/{android,ios,src}`, autolink, npm 배포 불필요)

로컬 모듈의 `modules/<name>/ios`·`android` 는 **커밋 대상이다** — `.gitignore` 가 루트 앵커
`/ios`·`/android` 라서 걸리지 않는다(`git check-ignore` 로 확인함). 모듈 추가 후
`npx pod-install` 재실행이 필요하고, 절대경로 import 를 쓰려면 `tsconfig.json` `paths` 에
별칭을 추가한다(기본 `@/*` 는 `./src/*` 만 가리킨다).

영향: `slug` 는 EAS 를 붙이기 전까지 사실상 라벨이다 — `@expo/config` 는 `slug` 가 비면
`name` 을 slugify 해서 채운다(`Config.js`, 필수 필드가 아니다). C4 의 `eas.json` 프로필 항목은
지웠고, CI 는 로컬 툴체인(frozen install → check-all → Doctor → export) 기준으로 남긴다.

### prebuild clean 과 iOS configuration 대소문자 (2026-09-07, `@expo/cli` 소스 확인)

참조 앱(KR/JP)에서 그대로 넘어온 두 가지를 SDK 57 CLI 소스로 검증해 고쳤다.

**1. `rm -rf ios android` 접두 제거 → `EXPO_NO_GIT_STATUS=1`**

- `--clean` 은 **선언만 되고 읽히지 않는다.** 실제 값은 `clean: !args['--no-clean']`
  (`prebuild/index.js:70,112`) — **재생성이 기본**이고 `--clean` 은 no-op 이다.
- 삭제 자체는 `fs.rm(folder, { recursive: true, force: true })`
  (`clearNativeFolder.js:123`) — `rm -rf` 와 같은 호출이라 삭제력에 차이가 없다.
- 다만 삭제 **전에** 프리빌드 전체를 `return null` 로 중단시키는 가드가 둘 있다
  (`prebuildAsync.js:107-124`, 네이티브 폴더가 이미 있을 때만 실행):
  `maybeBailOnGitStatusAsync()`(git dirty 프롬프트) · `maybeBailOnNativeModuleAsync()`.
  **예전 SDK 에서 git 가드가 기본 on 이었다면 dirty 트리에서 프리빌드가 중단됐고,
  `rm -rf` 는 그 우회였다** — 붙인 이유로 합리적이다.
- SDK 57 에서는 `EXPO_NO_GIT_STATUS` 가 `boolish('EXPO_NO_GIT_STATUS', true)`
  (`utils/env.js:87`) 라 **기본값 true** — 가드가 꺼져 있다. 그래서 `rm -rf` 는 잉여가 됐다.
- 유지 비용은 실재했다: `pnpm prebuild -p ios` 가 `rm -rf ios android` 를 먼저 돌려
  **`android/` 를 지우고 재생성하지 않았고**, `--no-clean` 이 무력화됐으며,
  `rm -rf` 가 `getConfig()` 보다 먼저라 `app.config.ts` 가 throw 하면(STRICT 시크릿 누락)
  네이티브 폴더만 날아간 채 실패했다.
- 결론: `"prebuild": "cross-env EXPO_NO_GIT_STATUS=1 expo prebuild"`.
  삭제는 기본 clean 에 맡기고, `rm -rf` 가 막아주던 것(git 가드)만 명시적으로 끈다 —
  Expo 가 기본값을 되돌려도 동작이 고정된다. `ios`/`android` 는 gitignore 대상이라
  이 프롬프트는 무관한 파일의 dirty 에 반응하는 것뿐이다.

**2. `ios:release` 의 `--configuration release` → `Release`**

`runIosAsync.js:106` 이 `setNodeEnv(options.configuration === 'Release' ? 'production' : 'development')`
로 **정확 문자열 비교**를 한다. 소문자면 조용히 `NODE_ENV=development` 가 되어 **release 빌드에
dev 번들이 들어가고**, `:186` 의 Release 분기도 건너뛴다. `XcodeBuild.js:262` 는 그 값을
`-configuration` 으로 그대로 넘기는데 프로젝트 configuration 은 `Debug`/`Release` 뿐이다
(`xcodebuild -list` 확인). Android 는 `variant?.toLowerCase().endsWith('release')`
(`runAndroidAsync.js:54`) 라 케이스 무관이어서 우연히 맞았다 — 그래서 두 스크립트가 비대칭이었다.

알려진 성질(고치지 않음): `:release` 스크립트는 `EXPO_PUBLIC_APP_ENV=development` 라
`index.js` 의 네트워크 로거 게이트(`__DEV__ || APP_ENV !== 'production'`)를 통과한다 —
**release configuration 빌드에 네트워크 로거가 포함된다.** 스토어 빌드가 아니라 로컬 release
스모크 테스트용이라 의도대로 둔다(2026-09-07 사용자 결정).

## 릴리즈 (템플릿 자체 버전)

버전이 두 곳에 있고 **뜻이 다르다**:

| 어디                              | 무엇                 | 누가 바꾸나       |
| --------------------------------- | -------------------- | ----------------- |
| `package.json` `version`          | 템플릿 자체 버전     | 템플릿 메인테이너 |
| `env-candidates.ts` `version.app` | **생성된 앱의** 버전 | 받는 쪽           |

### 버전을 올리는 기준

`0.x` 다 — **PoC 이고 API·구조 안정성을 약속하지 않는다.** 그래서 `0.x` 안에서는
breaking change 를 minor 로 낸다(semver 가 `0.x` 에 허용하는 것이다).

| 무엇이 바뀌었나                                                 | 올리는 자리 |
| --------------------------------------------------------------- | ----------- |
| 구조·계약 변경(폴더 이동 · `env-candidates` 필드 · 배럴 export) | `0.1.0`     |
| 버그 수정 · 의존성 패치 · 문서                                  | `0.0.2`     |

`1.0.0` 은 **실제 앱 하나를 이 템플릿으로 끝까지 만들어 스토어에 올린 뒤**에 단다.
그때까지는 무엇이 부족한지 알 수 없다.

### 브랜치 모델

`master` 가 **실 배포**다. 버전 브랜치가 develop 역할을 한다 — 피쳐를 거기에 모으고,
그 브랜치를 `master` 로 머지하는 순간이 릴리즈다.

```
feature/xxx ──PR──▶ 0.0.2 ──PR──▶ master ──tag──▶ v0.0.2
```

머지는 항상 **merge commit**(`gh pr merge --merge`)이다. squash 는 커밋 단위 이력과
`Co-Authored-By` 트레일러를 하나로 뭉갠다.

브랜치 이름에는 `v` 를 붙이지 않는다. 태그가 `v0.0.2` 라서 브랜치도 같은 이름이면
`git checkout 0.0.2` 가 "refname is ambiguous" 로 갈린다.

### 버전 브랜치를 남긴다

릴리즈 후에도 버전 브랜치를 지우지 않는다. 그 버전에 패치를 내야 할 때 — 0.0.2 를 쓰는
쪽이 0.0.3 으로 못 올라오는 상황 — 그 브랜치에서 바로 작업한다. React 의 `18.x`,
Node 의 `v20.x` 와 같은 유지 브랜치다.

`feature/*` 는 반대다. 머지되면 지운다(`gh pr merge --merge --delete-branch`) — 수명이
PR 하나짜리라 남기면 죽은 브랜치만 쌓인다.

### 절차

```bash
# 1. 피쳐는 버전 브랜치로 모은다
git switch -c feature/xxx 0.0.2
gh pr create --base 0.0.2 && gh pr merge --merge --delete-branch

# 2. 릴리즈할 준비가 되면 — 버전 브랜치의 마지막 커밋에서
#    CHANGELOG 의 [Unreleased] 를 새 버전 절로 바꾸고(Added·Changed·Fixed·Docs)
pnpm version 0.0.2 --no-git-tag-version   # package.json 만 바꾼다
pnpm check-all
git commit -am "chore(release): 0.0.2" && git push

# 3. 버전 브랜치를 master 로 — 이게 배포다
gh pr create --base master --head 0.0.2 --title "release: 0.0.2"
gh pr merge --merge          # 버전 브랜치는 지우지 않는다(아래 "버전 브랜치를 남긴다")

# 4. master 에서 태그를 단다. 태그는 배포된 커밋에 붙어야 한다
git switch master && git pull
git tag -a v0.0.2 -m "v0.0.2 — <한 줄 요약>" && git push --follow-tags

# 5. GitHub 릴리즈 — 정식 릴리즈로 올리고 Latest 를 붙인다(pre-release 에는 Latest 배지가 붙지 않는다)
gh release create v0.0.2 --title "v0.0.2" --latest --notes-file <(sed -n '/## \[0.0.2\]/,/## \[0.0.1/p' CHANGELOG.md)

# 6. 다음 버전 브랜치를 딴다
git switch -c 0.0.3 master && git push -u origin 0.0.3
```

### CLI 와의 관계

`create-lesa-app` 은 **자기 버전과 별개로** 템플릿 태그를 고정해 받는다
(`src/fetch-template.ts` 의 `TEMPLATE_REF`). 그래서 템플릿을 릴리즈하면 CLI 쪽도
그 값을 올려 다시 발행해야 새 템플릿이 나간다.

|               |                                                               |
| ------------- | ------------------------------------------------------------- |
| 템플릿만 바뀜 | 템플릿 릴리즈 → CLI 의 `TEMPLATE_REF` 올림 → CLI patch 릴리즈 |
| CLI 만 바뀜   | CLI 릴리즈만                                                  |

두 레포의 버전을 맞추려 하지 않는다 — 따로 움직인다.

## 검증 기준은 Expo 다

npm 최신 버전이 기준이 아니다. **`pnpm doctor`(expo-doctor) 와 `npx expo install --check`
가 통과하면 맞는 상태다.**

```bash
pnpm doctor                 # 18개 검사
npx expo install --check    # SDK 가 고정한 버전과 대조
CI=true pnpm run check-all  # lint → tsc → test
```

npm 에 더 높은 버전이 있어도 SDK 가 고정한 것과 다르면 올리지 않는다. `react-native` 와
`react` 는 `expo/bundledNativeModules.json` 이 정한다 — SDK 57 은 `react-native 0.86.3` 이라
0.87 로 손수 올리면 네이티브 코드젠·Podspec 이 expo 모듈들과 어긋난다. SDK 단위 업그레이드는
`upgrading-expo` 스킬로 한다.

`jest`·`@types/jest` 는 `expo.install.exclude` 에 있다. Expo 는 29 를 기대하지만 이 템플릿은
30 을 쓴다 — 안 빼면 `expo install --fix` 마다 되돌린다.

### Xcode 27 · iOS 27 SDK

두 가지가 걸린다. **하나는 이미 해결돼 있고 하나는 우리가 대응한다.**

**① Simulator.app → DeviceHub.app (대응 불필요).** Apple 이 Xcode 27 에서 `Simulator.app`
을 없앴다. `@expo/cli` 에 fallback 이 있다([#46757](https://github.com/expo/expo/pull/46757)) —
Simulator 를 먼저 찾고 없으면 `devices://device/open?id=<udid>` 로 DeviceHub 를 연다.
`xcrun simctl` 은 그대로 동작하므로 `boot.md`·`push.md` 의 딥링크·푸시 검증 명령은 유효하다.

**② UIScene 생명주기 (우리가 대응).** iOS 27 SDK 로 빌드한 앱은 UIScene 을 채택해야
**실행된다.** SDK 57 템플릿은 `AppDelegate` 가 window 를 만들어서 빌드는 되고 실행에서 죽는다.

```
Application failed to launch: UIScene life cycle is required for apps built with this SDK.
```

`patches/expo@57.0.22.patch` 가 런타임 클래스를, `plugins/with-ios-scene.ts` 가 생성물을
맡는다. 출처와 **제거 조건**은 [`patches/README.md`](../patches/README.md) — upstream
[#50026](https://github.com/expo/expo/pull/50026) 이 57.0.x 에 들어오면 둘 다 지운다.

scene 생명주기에서는 **링크가 AppDelegate 로 오지 않는다.** `SceneEventForwarder` 가
넘기므로 콜드 `Linking.getInitialURL()` 이 첫 실행에서 확인해야 할 항목이다.

### 앱 아이콘 배지는 1024×1024 를 요구한다

`app-icon-badge` 의 오버레이가 **1024×1024 고정**이고 `(0,0)` 에 합성된다. 원본이 그보다
크면 배지가 어긋난다 — 1254px 아이콘에서 배너가 폭의 81.7% 만 덮고 하단이 아니라
y 67~82% 에 앉아 아이콘 본체를 가렸다(실측). `icon.png`·`adaptive-icon.png` 를
**1024×1024 로 맞춘다**(Apple 요구 크기이기도 하다).

```bash
sips -z 1024 1024 assets/images/icon.png assets/images/adaptive-icon.png
```

**두 파일은 역할이 다르다.** `icon.png` 은 풀블리드(iOS), `adaptive-icon.png` 은 **여백 있는
foreground**(Android)다. Android 런처 마스크는 108dp 중 가운데 72dp 만 보장하므로 풀블리드를
넣으면 가장자리가 잘린다. 아이콘 파이프라인이 두 산출물을 따로 내면 각각을 쓴다 — 풀블리드
하나를 두 곳에 넣지 않는다.

배지 자체는 두 경우를 알고 처리한다(adaptive 는 배너 높이 310px, 텍스트를 안전 영역 안에
올린다). 원본 크기만 1024 로 맞추면 된다.

## 테스트 — 쓰고 싶으면 쓰는 것

`jest-expo` 설정이 있고 `check-all` 에 포함된다. **네이티브 모듈 목은 두지 않는다.**
MMKV·RNFB·notifee 를 목으로 세우기 시작하면 목을 실제 API 와 맞추는 일이 본업이 되고,
이름 하나 어긋나면(v4 는 `delete` 가 아니라 `remove` 다) 테스트가 생길 때까지 아무 소리도
나지 않는다. 그 값을 템플릿이 대신 내지 않는다.

그래서 템플릿 테스트는 **목 없이 도는 순수 로직**만 다룬다.

```
jest.config.js        preset · 경로 별칭 · transformIgnorePatterns
src/types/jest.d.ts   `/// <reference types="jest" />` · `node`
```

| 파일                                      | 무엇을 지키나                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `env.test.ts`                             | 환경 leaf 접기. 키가 하나 빠지면 undefined 가 아니라 throw 해야 한다     |
| `eslint.config.test.ts`                   | import 경계가 실제로 발동하는지(eslint 를 직접 돌린다)                   |
| `plugins/with-android-plugin.test.ts`     | release 서명 주입. 앵커가 어긋나면 debug 키로 서명된 빌드가 나간다       |
| `src/lib/deep-link/parser.test.ts`        | 딥링크 파싱. 인코딩된 세그먼트가 라우트 모양을 바꾸지 않아야 한다        |
| `src/lib/deep-link/extractors.test.ts`    | 푸시 payload → url 계약. 키가 어긋나면 알림이 조용히 아무 일도 안 한다   |
| `src/lib/deep-link/dispatcher.test.ts`    | cold 홀드와 TTL 중복 제거. 틀리면 화면이 두 번 열리거나 splash 에 갇힌다 |
| `src/lib/preloader/core.test.ts`          | 스테이지 격리. 앱 콜백이 throw 해도 부팅이 죽지 않아야 한다              |
| `src/lib/preloader/forced-update.test.ts` | 버전 비교. 틀리면 전 사용자가 막히거나 아무도 안 막힌다                  |

뒤 세 개는 **자기 바로 아래 모듈만** 목한다(스테이지 함수·matcher·정책 요청). 공용 설정에
쌓이는 목이 아니라 그 파일 안에서 끝난다.

딥링크 테스트는 URL 을 `Env.identity.scheme` 에서 만든다 — 하드코딩하면 CLI 가 식별자를
치환한 뒤 깨진다.

**화면·스토어 테스트가 필요하면 앱이 자기 방식대로 세운다.** MMKV·RNFB·reanimated 를
건드리는 순간 목이 필요하고, 그 형태는 앱마다 다르다.

**첫 테스트를 쓸 때 알아야 하는 것:**

1. **`jest` 객체는 import 한다.** `@types/jest` 30 은 `describe`·`it`·`expect` 만 전역으로
   선언하고 `jest` 는 `@jest/globals` 로 옮겼다. 런타임에는 전역이라 돌지만 `tsc` 가 막는다.

   ```ts
   import { jest } from '@jest/globals';
   ```

2. **`render` 는 await 한다.** RNTL 14 부터 async 다.

3. **"Unexpected token 'export'" 가 나면** 그 패키지를 `transformIgnorePatterns` 에 더한다.
   RN 생태계는 ESM 소스를 그대로 배포한다. `expo-router` 를 쓰려면 `standard-navigation` 도
   필요했다(실측).

4. **모듈 레벨 상태를 쓰는 모듈은 `jest.resetModules()` 후 `require` 로 다시 읽는다.**
   `import` 는 한 번만 평가되므로 큐·플래그가 테스트 간에 샌다. 단 그러면 클래스 동일성이
   깨진다 — 같은 레지스트리에서 꺼내 써야 `instanceof` 와 필드가 유지된다(실측).

`src/types/jest.d.ts` 가 필요한 이유: pnpm 격리 구조에서 tsc 의 `@types` 자동 탐색이
`@types/jest` 를 못 집는다. `tsconfig` 의 `types` 배열을 쓰면 다른 `@types` 자동 포함이
막히므로 reference 지시자로 푼다.

## 거부된 대안 (다시 제안하지 말 것)

- `dotenv` → Node 내장 `process.loadEnvFile`(20.12+). `scripts/load-build-env.cjs`.
- 코드 출처 값에 zod 런타임 검증 → 타입 체커가 이미 잡는다(위 "Safety rules").
- `prebuild` 앞에 `rm -rf ios android` → 재생성이 기본이라 잉여이고 `-p`·`--no-clean` 을 깨뜨린다
  (위 "prebuild clean").
- `eas.json` 을 템플릿에 포함 → EAS 는 파일 존재로 갈리는 opt-in(위 "EAS").
- `plugins/with-display-name.ts` 를 따로 두기 → Android mod 한 개라 `with-android-plugin` 안.
- `ios.deploymentTarget: '16.0'` → SDK 57 기본이 16.4. 낮추면 pod 경고·실패.
- 이름 후보 `byEnv` · `resolveEnv` · `env-records` 등 → 현재 이름으로 확정(위 "Naming decisions").
