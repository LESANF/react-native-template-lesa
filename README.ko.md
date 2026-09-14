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
> MVP 단계라 너무 실험적입니다. 사용을 권하지 않습니다.
>
> 문서·README·코드 모두 앞으로 많이 바뀔 수 있습니다.

Expo SDK 57 기준 템플릿입니다. 라우팅·부트 시퀀스·푸시·OTA·딥링크가 이미 배선돼 있고,
**전부 꺼진 채로** 들어 있습니다. 파일을 넣거나 값을 채우면 그때 켜집니다.

## 시작하기

```bash
npx create-lesa-app my-app
cd my-app && pnpm install
pnpm ios:development     # 또는: pnpm android:development
```

CLI 가 앱 이름을 묻고, 이름이 소문자 ASCII 가 아니면 slug 을 따로 묻고, Apple Team ID 는
선택으로 받습니다. slug 하나에서 나머지 식별자를 전부 파생하고 초기 커밋까지 만듭니다.
이 레포를 직접 클론해도 되지만 그러면 `env-candidates.ts` 를 손으로 채워야 합니다.

> NativeTabs 를 비롯한 네이티브 모듈을 쓰므로 **dev client** 가 필요합니다 — Expo Go 로는
> 돌지 않습니다.

## 무엇이 들어 있나

|                                  |                                                              |
| -------------------------------- | ------------------------------------------------------------ |
| Expo SDK 57 · RN 0.86 · React 19 | CNG 우선 — `ios/`·`android/` 는 소스가 아니라 산출물         |
| expo-router 57                   | 파일 기반 라우팅, NativeTabs(iOS 26 liquid glass)            |
| Uniwind 1.11                     | 3계층 디자인 토큰(primitive → semantic → utility) + 다크모드 |
| TanStack Query 5 · Axios         | 명시적 auth, MMKV 토큰 저장                                  |
| Zustand 5                        | 클라이언트 상태 — auth·overlay                               |
| Reanimated 4.5                   | safe area 는 `InsetView` — 탭 전환에서 덜컹거리지 않게       |
| hot-updater                      | EAS Update 가 아닌 자체 OTA                                  |
| FCM + notify-kit                 | 백그라운드·종료 상태 탭을 딥링크 큐 하나로 모음              |
| i18next                          | 단일 언어 프로젝트는 그대로 통과                             |
| ESLint                           | 단방향 import 강제 — 폴더를 지우면 그걸로 제거 끝            |

## 주입 = 활성화

기능 플래그를 두지 않았습니다. 파일이나 값의 **존재**가 기능을 켭니다 — "플래그는 켜져
있는데 키가 없다" 는 상태를 만들지 않으려고요.

| 채우는 곳                                                                    | 켜지는 것                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `firebase/GoogleService-Info.<env>.plist` **+** `google-services.<env>.json` | 푸시. 하나만 있으면 throw                                                      |
| `env-candidates.ts` 의 `urls.ota` + `hot-updater.config.ts` 버킷             | OTA. 비면 프리로더가 그 단계를 건너뜀                                          |
| `src/constants/deep-link.ts` 의 `DEEP_LINK_HTTPS_HOSTS`                      | 유니버설 링크 — iOS `associatedDomains`·Android `intentFilters` 가 여기서 파생 |
| `lib/deep-link/attribution.ts`                                               | 어트리뷰션 SDK. 비면 no-op                                                     |
| `.env` 의 `APP_BUILD_ONLY_APPLE_TEAM_ID`                                     | iOS 디바이스 서명. 비우면 Xcode 자동 서명                                      |
| `eas.json`, 또는 `app.config.ts` 의 두 줄                                    | EAS Build/Submit. 없으면 로컬 빌드 경로                                        |

## 내 앱으로 바꾸기

식별자는 `create-lesa-app` 이 채워줍니다. 아래는 그것이 건드리는 것과, 남는 것입니다.

### 1. 정체성 — `env-candidates.ts`

이 파일 하나입니다. `app.config.ts` 와 네이티브 설정이 전부 여기서 파생됩니다.

| 필드                                     | 무엇                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `identity.name`                          | **ASCII 로 유지합니다.** prebuild 가 이 값에서 iOS Xcode 프로젝트·스킴·`PRODUCT_NAME` 을 만듭니다 |
| `identity.displayName`                   | 홈 화면 이름. 한글·일본어 이름은 `name` 이 아니라 **여기** 입니다. 비우면 `name` 을 씁니다        |
| `identity.slug`                          | Expo 프로젝트 식별자                                                                              |
| `identity.scheme`                        | 딥링크 스킴, 환경별                                                                               |
| `identity.bundleId` · `identity.package` | iOS 번들 ID·Android 패키지, 환경별                                                                |

> `name` 에 한글을 넣으면 iOS 프로젝트가 `app` 이 됩니다 — Expo 의 sanitizer 가 non-word
> 문자를 전부 지웁니다. 실측과 사유는 [`docs/config.md`](./docs/config.md).

### 2. API 주소 — `urls.api`

production 은 `.invalid` 로 나갑니다. 바꾸기 전까지 **production 부팅이 throw 합니다.**
설정 안 한 프로덕션 빌드가 조용히 나가는 걸 막으려고 일부러 그렇게 뒀습니다.
development·preview 는 jsonplaceholder 데모입니다.

### 3. 에셋 — `assets/images/`

`icon.png`(iOS·풀블리드) · `adaptive-icon.png`(Android·여백 있는 버전) · `splash-icon.png`.

Android adaptive icon 은 108dp 중 가운데 72dp 만 남고 바깥은 런처 마스크에 잘립니다.
풀블리드를 그대로 넣으면 안 되고, `adaptiveIcon.backgroundColor` 를 그 파일 배경색과
맞춥니다.

splash 배경색은 **두 곳**에 있습니다 — `app.config.ts` 의 `expo-splash-screen`
`backgroundColor` 와 `src/features/splash/splash-screen.tsx`. 어긋나면 네이티브→JS splash
이음새가 눈에 보입니다.

그 밖에 프로젝트가 채우는 지점은 `grep -rn "TODO(앱)" src` 와
[`data-layer.md`](./docs/data-layer.md) · [`boot.md`](./docs/boot.md) ·
[`push.md`](./docs/push.md) 의 표에 있습니다.

## 빌드와 배포

기본은 로컬 프리빌드 + 로컬 네이티브 빌드입니다. `eas.json` 을 넣지 않았으니 EAS 는 꺼진
상태이고, `eas init` 을 돌리거나 `app.config.ts` 의 주석 두 줄을 채우면 켜집니다 — 사유는
[`docs/config.md`](./docs/config.md).

```bash
pnpm prebuild:production      # STRICT 검증, 네이티브 재생성이 기본
pnpm ios:release              # expo run:ios --configuration Release
pnpm android:release          # expo run:android --variant release
```

> `prebuild` 는 네이티브 폴더를 **지우고 다시 만드는 것이 기본**입니다(`--clean` 은 SDK 57
> 에서 no-op). 증분은 `pnpm prebuild --no-clean`, 한 플랫폼만은 `-p ios`.
>
> `:release` 스크립트는 `EXPO_PUBLIC_APP_ENV=development` 로 돌아서 **네트워크 로거가
> 포함**됩니다 — 스토어 빌드가 아니라 로컬 release 스모크 테스트용입니다.

- **Android 서명** — `plugins/with-android-plugin.ts` 가 production 프리빌드에서만
  `signingConfigs.release` 를 주입합니다. 값은 `.env` 가 아니라 **Gradle 실행 시점의 환경
  변수**(`ANDROID_UPLOAD_KEYSTORE_PATH` 등)에서 읽습니다.
- **iOS 서명** — `.env` 의 `APP_BUILD_ONLY_APPLE_TEAM_ID`, 비우면 Xcode 자동 서명입니다.
  스토어 업로드는 Xcode 로 합니다.
- **OTA** — hot-updater 는 자체 서버라 EAS Update 와 무관합니다(`pnpm ota:deploy:*`,
  [`docs/boot.md`](./docs/boot.md)).

## `.env` · app config · CNG

- **`.env` 는 빌드 타임 시크릿 전용**(`APP_BUILD_ONLY_*`)입니다. `app.config.ts` 의
  `requireInStrict()` 만 읽고, `EXPO_PUBLIC_` 접두사가 없어서 클라이언트 번들에 들어가지
  않습니다. `pnpm install` 이 `.env.example` 에서 만들고 커밋되지 않습니다.
- **런타임 공개 값은 `.env` 가 아니라 `env-candidates.ts`.** 환경 전환은 package.json
  스크립트가 `EXPO_PUBLIC_APP_ENV` 로 주입하고, `EXPO_PUBLIC_*` 을 직접 읽는 코드는
  없습니다.
- `prebuild:*` · `ios:*` · `android:*` 는 `STRICT_ENV_VALIDATION=1` 로 돕니다 — 시크릿이
  비면 그 자리에서 throw 하고 마스킹된 요약을 찍습니다.
- **네이티브 파일을 직접 고치지 않습니다.** `ios/`·`android/` 는 산출물이고 다음
  프리빌드에 날아갑니다. 생성되는 설정을 바꾸려면 **config plugin**(`plugins/`), Swift·
  Kotlin 이 필요하면 **로컬 Expo Module**(`pnpm create expo-module --local`) 입니다.
  로컬 모듈의 `ios`·`android` 는 **커밋해야 합니다** — `.gitignore` 는 루트의 것만
  무시합니다.
- **`.env.example` 마지막 줄은 `=` 없는 주석으로** 둡니다 — Expo CLI 가 쓰는 Node
  `util.parseEnv` 가 파일 끝 주석에 `=` 가 있으면 변수로 읽습니다.

## 검증

```bash
CI=true pnpm run check-all     # lint → type-check → test
pnpm doctor
```

## 구조

```
src/
  app/          라우팅 전용 — 한 줄 재export 로 features 에 넘김
  features/     화면 실체, 라우트와 1:1
  providers/    루트 조립 (app-providers 감싸기 / global-overlays 띄우기)
  components/   ui(배럴) · icons · navigation
  styles/       토큰 3계층
  api/          도메인별 requests · queries · mutations · types
  lib/          인프라 — api · auth · preloader · deep-link · push ·
                i18n · navigation · storage · theme
  stores/       클라이언트 상태 — auth · overlay
  constants/ hooks/ types/ utils/
```

import 는 한 방향입니다 — `app` → `features` → shared. 역방향은 `providers` 에서 에러,
나머지는 경고입니다. 이게 "폴더를 지우면 제거 끝" 을 성립시킵니다.

## AI 에이전트로 작업할 때

규칙과 메커니즘은 [`AGENTS.md`](./AGENTS.md) 에 있고, `.claude/hooks/route.mjs` 훅이
작업 중에 필요한 줄만 꺼내 줍니다 — Claude Code 와 Codex 가 같은 스크립트를 씁니다.
Claude Code 는 [Expo 공식 플러그인](https://docs.expo.dev/agents/claude/) 한 번으로 스킬과
MCP 를 같이 등록합니다.

<details>
<summary>있으면 더 잘 도는 MCP·스킬</summary>

**MCP**

|                                                        |                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| [expo](https://docs.expo.dev/mcp/)                     | SDK 57 문서를 직접 읽습니다. 기억으로 답하면 대개 낡은 SDK 입니다 |
| [codegraph](https://github.com/colbymchenry/codegraph) | 심볼·호출 관계 인덱스 — 구조 질문을 grep 없이                     |
| [context7](https://github.com/upstash/context7)        | 서드파티 라이브러리 문서                                          |

**스킬**

|                                                          |                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `react-native-best-practices`                            | Software Mansion, New Architecture 기준                                               |
| `animate-expo`                                           | Reanimated · Gesture Handler · 햅틱. **웹 전용 `animate`·`motion-react` 와 다릅니다** |
| `hot-updater`                                            | 이 템플릿의 OTA 엔진                                                                  |
| `rn-keyboard-handling`                                   | 폼·모달·바텀시트 키보드 회피                                                          |
| `expo-dev-client` · `expo-deployment` · `upgrading-expo` | dev client · 스토어 배포 · SDK 업그레이드                                             |

없어도 동작합니다. `AGENTS.md` 에 각각의 대체 경로를 적어뒀습니다.

</details>

## 문서

|                                              |                                           |
| -------------------------------------------- | ----------------------------------------- |
| [`docs/config.md`](./docs/config.md)         | env · app config · 플러그인 · 릴리즈 절차 |
| [`docs/boot.md`](./docs/boot.md)             | splash · 프리로더 · OTA · 딥링크          |
| [`docs/push.md`](./docs/push.md)             | FCM · 헤드리스 체인 · 탭                  |
| [`docs/routing.md`](./docs/routing.md)       | 라우트 · 탭 · 모달 · 오버레이             |
| [`docs/ui.md`](./docs/ui.md)                 | 토큰 · 다크모드 · `InsetView`             |
| [`docs/data-layer.md`](./docs/data-layer.md) | api · auth · query                        |
| [`docs/decisions.md`](./docs/decisions.md)   | 무엇을 언제 결정했나                      |

## 라이선스

MIT — [LICENSE](./LICENSE).
