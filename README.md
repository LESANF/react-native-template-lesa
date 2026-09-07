<p align="center">
  <img src="./assets/images/profile.jpg" alt="lesa-expo-template" width="180" />
</p>

<h1 align="center">lesa-expo-template</h1>

<p align="center">
  나만의 의견이 담긴 <b>Expo SDK 57</b> 스타터 — pnpm · CNG-first · 검증된 패턴만.
</p>

---

> 🚧 개발 중. 실무에서 반복해서 쓰던 패턴을 모은 개인 템플릿입니다.
>
> 현재 상태와 남은 작업은 [`docs/template-completion.md`](./docs/template-completion.md)를 기준으로 관리합니다.

## What's inside

- **Expo SDK 57** · pnpm · CNG-first (no committed `ios`/`android`)
- **expo-router** 파일 기반 라우팅 + **NativeTabs** (iOS 26 liquid glass)
- **Uniwind**(무료) + 3계층 디자인 토큰(primitive→semantic→utility) + **다크모드**(`@variant` + MMKV)
- **i18n** (i18next, 단일언어는 그대로 통과)
- **환경 전환** — `defineEnv` (env-candidates → env.ts), 시크릿은 `.env` 분리
- **앱 셸** — providers 역할 분리(감싸기/띄우기) + **Suspensive** ErrorBoundary
- **데이터 레이어** — Axios + TanStack Query + 명시적 auth + MMKV token
- **부팅 파이프라인** — splash 뒤 프리로더(강제 업데이트 · OTA(hot-updater) · 권한 슬롯) + 콜드 딥링크 큐 + 프리페치 ([`docs/boot.md`](./docs/boot.md))
- **푸시 알림** — FCM(RNFB 26) + notify-kit FCM Mode, 알림 탭 → 딥링크 큐, 토큰 동기화 어댑터, 알림 권한. `firebase/`에 설정 파일을 넣으면 활성 ([`docs/push.md`](./docs/push.md))
- **단방향 import** ESLint (폴더 지우면 그걸로 끝)

## Quick start

```bash
pnpm install    # .env 가 없으면 .env.example 에서 자동 생성 (빌드 시크릿 전용)
pnpm ios        # 또는: pnpm android  — dev client 빌드 + 실행
pnpm start      # dev 서버 (dev client)
```

> NativeTabs 등 네이티브 모듈을 쓰므로 Expo Go가 아닌 **dev client**가 필요합니다.

## Make it yours

새 앱으로 바꾸는 데 필요한 건 **`env-candidates.ts` 한 파일 + 에셋 몇 개**입니다.
`app.config.ts`와 네이티브 설정은 거기서 파생됩니다.

### 1. Identity — `env-candidates.ts`

| 필드                   | 지금 값                      | 바꿀 것                                                                                              |
| ---------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `identity.name`        | `write-your-app-name`        | 앱 이름. **ASCII로 유지** — prebuild가 이 값에서 iOS Xcode 프로젝트·스킴·`PRODUCT_NAME`을 파생합니다 |
| `identity.displayName` | `''` (비어 있음)             | 홈 화면에 보일 이름. **한글·일본어 이름은 `name`이 아니라 여기에.** 비우면 `name`을 그대로 씁니다    |
| `identity.slug`        | `write-your-app-slug`        | EAS 프로젝트 slug                                                                                    |
| `identity.scheme`      | `write-your-scheme-dev` 외 2 | 딥링크 스킴 3환경. 소문자로 시작하고 `[a-z0-9+.-]`만                                                 |
| `identity.bundleId`    | `write.your.bundlename.*`    | iOS 번들 ID 3환경                                                                                    |
| `identity.package`     | `write.your.bundlename.*`    | Android 패키지 3환경                                                                                 |

> `name`에 한글을 넣으면 iOS 프로젝트 이름이 `app`이 됩니다 — sanitizer가 non-word 문자를
> 전부 지우기 때문입니다. 실측표와 사유는 [`docs/decisions.md`](./docs/decisions.md) "표시명" 절.

### 2. API URL — `urls.api`

production이 `.invalid`로 남아 있으면 **production 부팅이 throw합니다**(`env.ts`가 막습니다).
교체를 잊고 배포하는 사고를 막으려고 의도한 동작입니다. development·preview는 jsonplaceholder 데모입니다.

### 3. 에셋 — `assets/`

`images/icon.png` · `expo.icon/`(iOS 26) · `images/android-icon-{foreground,background,monochrome}.png` ·
`images/splash-icon.png`

splash 배경색은 **두 곳을 같이** 바꿉니다 — `app.config.ts`의 `expo-splash-screen` `backgroundColor`와
`src/features/splash/splash-screen.tsx`. 어긋나면 네이티브→JS splash 이음새가 눈에 보입니다.

### 4. 채우면 켜지는 것들 (빈 값 = 비활성)

| 채울 곳                                                                  | 켜지는 것                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `urls.ota` + `hot-updater.config.ts` 버킷                                | OTA ([`docs/boot.md`](./docs/boot.md))                                          |
| `firebase/GoogleService-Info.<env>.plist` + `google-services.<env>.json` | 푸시 ([`docs/push.md`](./docs/push.md))                                         |
| `src/constants/deep-link.ts`의 `DEEP_LINK_HTTPS_HOSTS`                   | 유니버설 링크 — iOS `associatedDomains`와 Android `intentFilters`가 여기서 파생 |
| `.env`의 `APP_BUILD_ONLY_APPLE_TEAM_ID`                                  | iOS 디바이스 빌드 서명 (비우면 Xcode 자동 서명)                                 |
| Gradle 환경변수 `ANDROID_UPLOAD_*`                                       | Android release 서명                                                            |

그 밖에 프로젝트가 채우는 지점은 `grep -rn "TODO(앱)" src`와
[`data-layer.md`](./docs/data-layer.md) · [`boot.md`](./docs/boot.md) · [`push.md`](./docs/push.md)의 표에 있습니다.

### 5. EAS

`eas init`을 돌리거나 `app.config.ts` 아래쪽 주석 두 줄을 채웁니다.

```ts
owner: 'your-expo-account',
extra: { eas: { projectId: 'xxxxxxxx-xxxx-...' } },
```

`slug`는 EAS 프로젝트와 같아야 합니다.

### 6. `.env` · app config · CNG 규칙

- **`.env`는 빌드 타임 시크릿 전용**(`APP_BUILD_ONLY_*`). `app.config.ts`의 `requireInStrict()`만
  읽고 `EXPO_PUBLIC_` 접두사가 없으니 클라이언트 번들에 들어가지 않습니다. `pnpm install`의
  postinstall이 `.env.example`에서 자동 생성하며 **커밋되지 않습니다**.
- **런타임 공개 값은 `.env`가 아니라 `env-candidates.ts`.** 환경 전환은 package.json 스크립트가
  `EXPO_PUBLIC_APP_ENV`로 주입합니다. 이 프로젝트는 `EXPO_PUBLIC_*` 변수를 직접 쓰지 않습니다.
- **`prebuild:*` · `ios:*` · `android:*` 스크립트는 `STRICT_ENV_VALIDATION=1`로 돕니다** —
  시크릿이 비어 있으면 그 시점에 throw하고, 마스킹된 요약을 출력합니다.
- **CNG** — `ios/`·`android/`는 산출물이라 커밋하지 않습니다. `pnpm prebuild`가 `rm -rf` 후
  재생성하므로 **네이티브 파일을 직접 고치면 날아갑니다.** 네이티브 변경은 `plugins/`의
  config plugin으로 넣으세요.
- `.env.example`의 **마지막 줄은 `=` 없는 주석으로 유지**하세요 — Expo CLI가 쓰는 Node
  `util.parseEnv`가 파일 끝 주석에 `=`가 있으면 그것을 변수로 읽습니다.

## Verify

```bash
CI=true pnpm run check-all
pnpm doctor
```

## Structure

```
src/
  app/          라우팅 전용 (한 줄 재export → features)
  features/     화면 실체 (라우트와 1:1)
  providers/    루트 조립 (app-providers 감싸기 / global-overlays 띄우기)
  components/ui 디자인시스템 (배럴 진입점)
  styles/       토큰 3계층
  api/          도메인별 requests·queries·mutations·types
  lib/          인프라 (api·auth·preloader·ota·deep-link·push·i18n·storage·theme)
  stores/       클라이언트 상태 (auth·overlay)
```

설계 결정과 근거는 [`docs/decisions.md`](./docs/decisions.md), 데이터 레이어 규칙은
[`docs/data-layer.md`](./docs/data-layer.md) 참고.
