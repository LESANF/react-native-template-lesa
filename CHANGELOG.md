# Changelog

[Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) · [Semantic Versioning](https://semver.org/lang/ko/)

버전이 두 개다. **`package.json`** 은 템플릿 자체 버전이고, **`env-candidates.ts` 의
`version.app`** 은 생성된 앱의 버전이다(받는 쪽이 관리한다).

릴리즈 절차는 [docs/config.md](docs/config.md) "릴리즈".

## [Unreleased]

### Fixed

- **푸시를 켜면 prebuild 가 실패했다.** `expo-build-properties@57.0.19` 의
  `enableSceneSupport` 가 `AppDelegate` 를 고치는 다른 플러그인과 충돌한다 — 푸시가 켜지면
  RNFB 가 `FirebaseApp.configure()` 를 넣으므로 이 템플릿이 정확히 그 경우다. 57.0.20 으로
  올려 해소했다([#50210](https://github.com/expo/expo/issues/50210)).
  푸시 ON 상태로 prebuild → `xcodebuild` 까지 확인했다(error 0, Firebase pods 컴파일)

## [0.0.6] — 2026-09-16

### Fixed

- `app.config.ts` 의 lint 위반 2건. `process.env[key]` 동적 접근(Metro 가 인라인 못 한다)과
  `require('node:fs')`. 값을 인자로 받게 바꾸고 일반 import 로 되돌렸다 — `@types/node` 는
  이미 참조돼 있다

### Changed

- iOS 27 UIScene 을 **공식 스위치로 교체**했다 — `expo-build-properties` 의
  `ios.enableSceneSupport: true`. 자체 플러그인(`plugins/with-ios-scene.ts`)과
  `expo@57.0.22` 패치를 지웠다. Expo 가 SDK 57 에 **opt-in** 으로 낸 것이다
  ([#50191](https://github.com/expo/expo/pull/50191) 런타임 ·
  [#50205](https://github.com/expo/expo/pull/50205) 스위치) — SDK 중간에 기본값을 바꾸면
  기존 앱의 AppDelegate 가 깨지기 때문이다. 하루 만에 upstream 이 따라왔다
- `expo` 57.0.22 → 57.0.23, `expo-build-properties` 57.0.17 → 57.0.19

## [0.0.5] — 2026-09-15

### Fixed

- `adaptive-icon.png` 을 아이콘 파이프라인의 **여백 있는 foreground 산출물**로 교체했다.
  풀블리드를 1024 로 줄여 넣었더니 Android 런처 마스크(108dp 중 가운데 72dp)에 가장자리가
  잘렸다. `icon.png` 은 풀블리드가 맞고 그대로다(파이프라인 산출물과 바이트 동일 확인)

## [0.0.4] — 2026-09-15

### Fixed

- **iOS 27 SDK 에서 앱이 실행되지 않았다.** Apple 이 UIScene 생명주기를 필수로 만들었고,
  SDK 57 템플릿은 `AppDelegate` 가 window 를 만들어서 **빌드는 되고 실행에서 죽었다**
  (`UIScene life cycle is required for apps built with this SDK`). `patches/expo@57.0.22.patch`
  가 런타임 클래스 3개를, `plugins/with-ios-scene.ts` 가 Info.plist scene manifest ·
  AppDelegate 수정 · `SceneDelegate` 선언을 맡는다. 출처는 upstream
  [expo/expo#50026](https://github.com/expo/expo/pull/50026)(SDK 57 타깃, 미머지) 원본 파일
  그대로다. 제거 조건은 `patches/README.md`
- 앱 아이콘 배지가 어긋나 있었다. `app-icon-badge` 오버레이가 1024×1024 고정인데 아이콘이
  1254px 이라 배너가 폭의 81.7% 만 덮고 하단이 아니라 y 67~82% 에 앉아 아이콘 본체를
  가렸다. `icon.png`·`adaptive-icon.png` 를 1024×1024 로 맞췄다

## [0.0.3] — 2026-09-15

### Docs

- 검증 기준을 명시했다 — **npm 최신이 아니라 Expo 다.** `pnpm doctor` + `expo install --check`
  가 통과하면 맞는 상태다. RN·React 는 `bundledNativeModules.json` 이 정하므로 npm 에 더
  높은 버전이 있어도 올리지 않는다(SDK 57 = RN 0.86.3). `AGENTS.md` ④ · `docs/config.md`
- Xcode 27 을 기록했다. Apple 이 `Simulator.app` 을 `DeviceHub.app` 으로 대체했고
  `@expo/cli` 에 fallback 이 들어가 있다(expo/expo#46757) — 템플릿이 할 일은 없다.
  `xcrun simctl` 은 그대로 동작하므로 딥링크·푸시 검증 명령은 유효하다
- `template-completion.md` 의 "커밋 전" 헤더 2개와, 뒤집힌 테스트 결정을 실제 상태로 맞췄다

### Fixed

- **크래시 리포터가 부팅을 죽일 수 있었다.** 앱이 넣은 `onStageError`·`onProgress` 가
  throw 하면 `runPreloader` 가 reject 돼 splash 가 끝나지 않고 앱이 아예 뜨지 않았다.
  이 콜백들은 이미 뭔가 잘못됐을 때 불린다 — 이제 격리하고, 실패는 콜백보다 먼저
  기록한다(콜백이 throw 하면 기록까지 사라졌다)

- 딥링크 파라미터가 인코딩된 경우 라우팅이 어긋났다. 파서가 세그먼트를 나눠 디코딩한 뒤
  **다시 이어서 재분할**하는 바람에 인코딩된 슬래시(`menu-4/a%2Fb`)가 세그먼트 개수를
  바꿨고, expo 경로에는 디코딩된 값이 재인코딩 없이 들어갔다(`/(tabs)/menu-4/a b`).
  이제 세그먼트 배열이 원본이고 경로에 넣을 때 다시 인코딩한다 — 공백·슬래시·한글 id

### Added

- 자리표시 로그인 화면(`app/auth/login.tsx`). auth 게이트가 `AUTH_LOGIN_PATH` 로 push
  하는데 **그 라우트가 템플릿에 없어서**, 게이트를 켠 딥링크가 `+not-found` 로 떨어지고
  보류 의도는 이미 저장된 뒤라 빠져나갈 길이 없었다. 앱은 화면 내용만 교체하면 되고
  계약은 하나다 — 성공하면 `signIn(tokens)`. 개발용 로그인 버튼은 `__DEV__` 안에 있다

- 푸시 payload → url 추출 테스트 8개. 계약 키가 어긋나면 알림이 조용히 아무 일도 안 한다

- 프리로더 테스트 19개 — 부팅 오케스트레이션 7, 강제 업데이트 12. 버전 비교가 틀리면
  전 사용자가 스토어로 막히거나 아무도 막히지 않는다

- 딥링크 parser 테스트 9개 — 인코딩된 세그먼트가 라우트 모양을 바꾸지 않는지

- **providers 역류 error 가 `features/` 에서 발동하지 않았다.** flat config 는 같은 rule
  키를 쓰는 블록 중 마지막 것만 적용하는데, cross-feature 블록이 같은
  `no-restricted-imports` 를 다시 써서 providers 규칙을 통째로 덮었다 — 그 규칙이 가장
  중요한 곳이 features 다. error(providers)는 `import/no-restricted-paths`,
  warn(나머지)은 `no-restricted-imports` 로 키를 갈라 고정했다. 실제로 eslint 를 돌리는
  회귀 테스트 5개 추가(수정 전 코드에서 3개 실패하는 것을 확인)
- providers 끼리 절대경로로 조립하는 것도 error 로 잡았다 — provider 합성은 정상이다

- Android release 서명 주입이 앵커를 못 찾으면 **throw 한다.** 그냥 두면 두 가지로
  조용히 망가졌다 — signingConfigs 주입만 실패하면 Gradle 이 없는
  `signingConfigs.release` 를 찾고, buildTypes 치환만 실패하면 **debug 키로 서명된
  릴리즈가 그대로 나간다.** `signingConfigs` 와 `buildTypes` 사이에 주석 한 줄만 끼어도
  앵커가 깨지는 것을 실측했다. 테스트 7개 추가
- reanimated 목에 템플릿이 실제로 쓰는 `FadeIn`·`FadeOut`·`runOnJS`·`useDerivedValue`·
  `useAnimatedReaction` 이 빠져 있었다 — 화면 테스트를 쓰는 순간 undefined 로 터진다

### Added

- 테스트 — `env.ts` 환경 접기 · 딥링크 디스패처 큐·중복 제거 · eslint 경계 규칙 ·
  Android 서명 주입 · 프리로더. **네이티브 모듈 목 없이 도는 것만** 둔다

### Fixed

## [0.0.2] — 2026-09-14

### Added

- MIT 라이선스. public 레포인데 라이선스가 없어서 아무 권리도 주지 못하고 있었다
- README 를 공개 — 그동안 본문이 HTML 주석 안에 있었다. 영어를 기본으로 두고 한국어는
  `README.ko.md` 에 둔다(`docs/` 는 한국어 유지). `npx create-lesa-app` 으로 시작하도록
  다시 썼고, "주입 = 활성화" 표를 넣었다
- 릴리즈·다운로드·스타·라이선스 배지

### Changed

- **jest 에서 네이티브 모듈 목을 걷어냈다.** MMKV·RNFB·notifee·reanimated 를 목으로
  세우면 목을 실제 API 와 맞추는 일이 본업이 된다 — 이름 하나 어긋나면(v4 는 `delete` 가
  아니라 `remove`) 아무 소리도 안 난다. 템플릿 테스트는 목 없이 도는 순수 로직만 다루고,
  화면·스토어 테스트는 필요한 앱이 자기 방식대로 세운다. `jest-setup.ts` 삭제

- SDK 57 패치를 최신에 맞췄다 — expo 57.0.21 → 57.0.22 외 15개. **네이티브에 영향이
  있으므로 재빌드가 필요하다**
- `expo.install.exclude` 에 `jest`·`@types/jest` 를 넣었다. Expo 는 jest 29 를 기대하지만
  이 템플릿은 30 을 쓴다 — `expo install --fix` 가 매번 되돌리려 드는 것을 막는다

- 브랜치 모델을 정했다 — `feature/xxx` → 버전 브랜치(`0.0.2`) → `master`.
  master 로 머지되는 것이 실 배포이고 태그는 그 뒤에 master 에서 단다. 머지는 항상
  merge commit(squash 는 커밋 단위 이력과 `Co-Authored-By` 트레일러를 뭉갠다).
  `AGENTS.md` ④ 와 `docs/config.md` "릴리즈"
- 커밋 메시지를 영어로 쓴다(공개 레포)

### Fixed

- `docs/config.md` 의 버전 표가 `minor 0.2.0` / `patch 0.1.1` 로 남아 있었다 —
  0.0.1 재시작 때 놓쳤다
- `docs/template-completion.md` 의 "커밋 전" 표기가 전부 거짓이었다(마지막 감사 07-28).
  전부 커밋돼 `v0.0.1` 로 나갔다 — 릴리즈 상태 절을 추가하고 `[~]` 를 "커밋됨, 기기에서
  미검증" 으로 재정의했다
- README 구조 절이 실제 트리와 달랐다 — `constants` `hooks` `types` `utils` 누락,
  존재하지 않는 `lib/ota` 표기

## [0.0.1] — 2026-09-11

첫 공개 릴리즈. **PoC** 다 — `0.0.x` 는 API·구조 안정성을 약속하지 않고 GitHub 에서
pre-release 로 표시한다. `1.0.0` 은 실제 앱 하나를 이 템플릿으로 끝까지 만든 뒤에 단다.

### Added

**부팅 파이프라인** — splash 뒤 프리로더(강제 업데이트 · OTA · 권한 슬롯) + 프리페치.
참조 앱의 `lib/preloader` verbatim 이식(대조 검증: `boot.md`).

**딥링크** — 파서 · 매처 · 큐 · 게이트 인프라 · 안전 탈출 계보(참조 앱). 어트리뷰션 SDK 는
`lib/deep-link/attribution.ts` 하나로 붙이고 뗀다.

**푸시** — FCM(RNFB 26.3.3) + notify-kit. 백그라운드/종료는 OS 가 표시하고 탭은 RNFB 로
오는 참조 앱 정책. 포그라운드 표시는 `SHOW_FOREGROUND_NOTIFICATION` 스위치.
활성화는 `firebase/` 파일 존재로 갈린다.

**OTA** — hot-updater(자체 서버). `Env.urls.ota` 가 비면 비활성.

**전역 오버레이** — `popup.confirm()` Promise 표면 · dev 네트워크 로거 FAB.

**툴링** — pnpm hoisted 링커 · prettier · 표시명 분리(`displayName`) · EAS 는 파일 존재로
갈리는 opt-in · 테스트 인프라(jest-expo + RNTL, 테스트 파일은 없음). SDK 57 패치 정렬(expo 57.0.21 · expo-router 57.0.20 ·
expo-build-properties 57.0.17 · expo-glass-effect 57.0.2).

**생성 CLI** — 형제 레포 `../create-lesa-app`. 질문 3개(앱 이름 → 필요 시 slug → Apple
Team ID)로 `env-candidates.ts` 를 치환하고 216파일을 초기 커밋한다. 복사 대상은 템플릿의
`git ls-files` — 산출물·로컬 상태를 정의상 제외한다. 계약은 `docs/cli.md` 단일 출처.

### Fixed

- `ios:release` 가 `--configuration release`(소문자)라 release 빌드에 dev 번들이 들어갔다.
  `runIosAsync.js` 가 `=== 'Release'` 정확 비교를 한다.
- `prebuild` 의 `rm -rf ios android` 접두 → `EXPO_NO_GIT_STATUS=1`. `-p` 와 함께 쓰면
  다른 플랫폼이 지워지고 재생성되지 않았다.
- 루트 `unstable_settings.anchor` 복원 — 없으면 expo-router 가 자식 정렬·딥링크 랭킹에서
  splash 가 첫 화면임을 모른다.
- 딥링크 in-flight 중복 창 · `makeKey` 키 충돌 · `external-web` 쿼리 인코딩 · 탭 이름 무검증.
- 푸시 토큰 동기화에 참조 앱의 in-flight 단일화와 fetch 후 auth 재확인 이식.
- 하이픈이 든 slug 이 잘못된 Android package 를 만들었다(`com.my-app.…`). `android.package`
  는 하이픈을 못 쓴다(SDK 57 app config 문서) → 리버스 도메인에서만 제거한다.
- CLI 가 완료 후 종료되지 않았다 — `exit()` 미호출로 인트로 타이머와 raw mode 가 이벤트
  루프를 잡고 있었다. 긴 화면에서 인트로 애니메이션 잔해가 쌓이던 것도 함께 고쳤다.
- 줄바꿈이 섞인 붙여넣기가 입력값에 `\r` 로 들어갔다(ink 는 `input === '\r'` 일 때만
  `key.return` 을 세운다).

### Docs

섹션별 6개 문서로 재편(`AGENTS.md` 가 폴더→문서 색인). 각 문서는 파일 지도 · 확정 결정 ·
거부된 대안 · 채우는 곳 · 검증 상태 순서다.

**코드 주석을 주의사항만 남기고 걷어냈다** — 813줄(20%) → 353줄(7%). 참조 앱은 2~3%다.
규칙·근거·필드 설명은 `docs/` 로 옮겼고(옮기기 전 `grep` 으로 누락 확인), 코드에는 모르면
깨지는 것만 남긴다: `app.config` 가 import 하는 파일의 런타임 import 금지, headless 공용
모듈의 React import 금지, `try/catch` 위치, 폴더 탭의 `_layout.tsx`, splash 배경색 일치 등.
코드는 한 줄도 바뀌지 않았다.

**예시값에서 회사 앱 이름을 제거했다** — 전수조사 후 `lesa-app` 으로 통일. 비ASCII 가 논점인
`sanitizedName()` 실측표만 `레사앱`·`レサアプリ` 로 둔다(ASCII 로 바꾸면 표가 결함을 증명하지
못한다 — 정규식을 직접 돌려 결과가 같은지 확인).

---

[unreleased]: https://github.com/LESANF/react-native-template-lesa/compare/v0.0.6...HEAD
[0.0.6]: https://github.com/LESANF/react-native-template-lesa/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/LESANF/react-native-template-lesa/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/LESANF/react-native-template-lesa/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/LESANF/react-native-template-lesa/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/LESANF/react-native-template-lesa/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/LESANF/react-native-template-lesa/releases/tag/v0.0.1
