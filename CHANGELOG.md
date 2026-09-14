# Changelog

[Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) · [Semantic Versioning](https://semver.org/lang/ko/)

버전이 두 개다. **`package.json`** 은 템플릿 자체 버전이고, **`env-candidates.ts` 의
`version.app`** 은 생성된 앱의 버전이다(받는 쪽이 관리한다).

릴리즈 절차는 [docs/config.md](docs/config.md) "릴리즈".

## [Unreleased]

### Fixed

- Android release 서명 주입이 앵커를 못 찾으면 **throw 한다.** 그냥 두면 두 가지로
  조용히 망가졌다 — signingConfigs 주입만 실패하면 Gradle 이 없는
  `signingConfigs.release` 를 찾고, buildTypes 치환만 실패하면 **debug 키로 서명된
  릴리즈가 그대로 나간다.** `signingConfigs` 와 `buildTypes` 사이에 주석 한 줄만 끼어도
  앵커가 깨지는 것을 실측했다. 테스트 7개 추가
- reanimated 목에 템플릿이 실제로 쓰는 `FadeIn`·`FadeOut`·`runOnJS`·`useDerivedValue`·
  `useAnimatedReaction` 이 빠져 있었다 — 화면 테스트를 쓰는 순간 undefined 로 터진다

### Added

- 테스트 24개 — `env.ts` 환경 접기(7) · 딥링크 디스패처 큐·중복 제거(9) · 토큰 갱신
  single-flight(8). 조용히 틀리면 화면이 두 번 열리거나 세션이 끊기는 세 곳이다

### Fixed

- `jest-setup.ts` 의 MMKV 목이 `delete` 를 내놓고 있었다. v4 는 `remove` 라서
  저장소를 건드리는 테스트가 전부 `storage.remove is not a function` 으로 터졌다

## [0.0.2] — 2026-09-14

### Added

- MIT 라이선스. public 레포인데 라이선스가 없어서 아무 권리도 주지 못하고 있었다
- README 를 공개 — 그동안 본문이 HTML 주석 안에 있었다. 영어를 기본으로 두고 한국어는
  `README.ko.md` 에 둔다(`docs/` 는 한국어 유지). `npx create-lesa-app` 으로 시작하도록
  다시 썼고, "주입 = 활성화" 표를 넣었다
- 릴리즈·다운로드·스타·라이선스 배지

### Changed

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
- 하이픈이 든 slug 이 잘못된 Android package 를 만들었다(`com.gym-log.…`). `android.package`
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

[unreleased]: https://github.com/LESANF/react-native-template-lesa/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/LESANF/react-native-template-lesa/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/LESANF/react-native-template-lesa/releases/tag/v0.0.1
