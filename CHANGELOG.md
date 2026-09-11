# Changelog

[Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) · [Semantic Versioning](https://semver.org/lang/ko/)

버전이 두 개다. **`package.json`** 은 템플릿 자체 버전이고, **`env-candidates.ts` 의
`version.app`** 은 생성된 앱의 버전이다(받는 쪽이 관리한다).

릴리즈 절차는 [docs/config.md](docs/config.md) "릴리즈".

## [Unreleased]

## [0.1.0] — 2026-09-11

첫 공개 릴리즈. **PoC** 다 — `0.x` 는 API·구조 안정성을 약속하지 않고 GitHub 에서
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

[unreleased]: https://github.com/LESANF/react-native-template-lesa/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/LESANF/react-native-template-lesa/releases/tag/v0.1.0

`foundation-2026-06` 태그는 버전 체계를 정하기 전의 6월 스냅샷이다. semver 밖 이름이라
릴리즈로 잡히지 않는다.
