# 템플릿 완성 TODO

> 마지막 감사: 2026-07-28 — 작업 트리 실측 기준 (문서 주장이 아니라 파일·명령 결과로 확인한 것만 적음)
> 이 문서가 구현 순서와 완료 상태의 단일 기준이다. 세부 설계 근거는 섹션 문서(`AGENTS.md` 표).

## 상태

- `[x]` 완료 및 검증됨
- `[~]` 작업 트리에 구현됨, 커밋 또는 최종 검증 대기
- `[!]` 외부 승인이나 환경 복구가 필요함
- `[ ]` 아직 시작하지 않음
- `결정` 코드가 아니라 판단이 필요한 항목. 결정 내용을 해당 섹션 문서에 남기고 `decisions.md` 색인에 한 줄 추가한다
- `앱 TODO` 실제 앱의 서버·브랜드·제품 정책이 있어야 결정 가능함

## 0. 선행 블로커 — 해소됨 (2026-08-26)

- [x] 비어 있던 `node_modules` 복구 — `pnpm install`(non-frozen, 1m24s). release-age 예외는 `pnpm-workspace.yaml` 기록분으로 충분했음
- [x] lockfile 갱신 — `CI=true`(frozen)에서 "Lockfile is up to date" 확인
- [x] `CI=true pnpm run check-all` 통과 (lint + tsc)
- [x] `npx expo-doctor` 18/18, `npx expo install --check` "Dependencies are up to date"
- [x] development iOS export 통과 (`npx expo export -p ios`, Hermes 번들 생성)

## SDK 57 마이그레이션 (2026-08-31)

- [x] expo 55.0.30 → **57.0.18** (Hermes V1 메모리 리그레션 수정 포함 — 57.0.9 미만 금지 가드 통과). RN **0.86.3** · React **19.2.3** · reanimated 4.5.1 · worklets 0.10.1 · GH 2.32 · expo-router 57.0.17
- [x] lockfile 클린 재생성(잔존 @expo/dom-webview@55 제거) → peers clean
- [x] SDK 56 규칙: `@react-navigation/*` import 3파일을 `expo-router/react-navigation`으로 codemod, deps 3종 제거. `__root`(INTERNAL_SLOT_NAME)는 57.0.17에서 동일 확인 — reset 훅 무변경
- [x] app.config plugins 추가(expo-font·image·web-browser, --fix 요구), expo-constants 복원(expo-router 필수 peer — doctor 지적), react-dom 추가(expo-router/ui의 radix peer), typescript ~6.0.3, eslint-config-expo ~57.0.2, uniwind 1.11, mmkv 4.3.2, netinfo 12
- [x] 신규 lint 규칙 대응(동작 동일): button 스로틀을 프레스 시점 타임스탬프로(react-hooks/refs), use-deferred-loading을 렌더 중 상태 보정 패턴으로(set-state-in-effect)
- [x] unmaintained `@react-native-community/blur` → **expo-blur** (Dimmed API 무변경, intensity 환산 + Android 실블러 옵션)
- [x] 게이트: check-all(tsc 6) · doctor 18/18 · `expo install --check` · frozen install · iOS export(--clear) · 하네스 auth 9/9 / client 8/8 / env 13/13
- [x] 2026-09-03 패치 정렬: expo 57.0.19 · router 57.0.18 등 7개. `@expo/metro-runtime`은 expo-router 필수 peer(^57.0.15)라 직접 의존성으로 추가(57.0.15). doctor 18/18 복귀
- [ ] 사용자 시뮬 확인(dev client 재빌드 `pnpm ios` 필수): B1 탭(iOS26 + Android selected 아이콘 — SDK 56부터 지원), B3 API 화면, menu-2 Reanimated 예제, Dimmed blur 시감
- [x] 커밋 3개 완료: `959c596` chore(SDK 57) / `e19052e` refactor(react-navigation→expo-router) / `cf7efff` fix(hooks 규칙·expo-blur) + `8d7c51e` vscode 설정 정리

## 현재 위치

- [x] `6b7c225` NativeTabs 아이콘과 fallback 커밋
- [x] `5f0da26` 로컬 로그·도구 산출물 ignore 커밋
- [x] 스냅샷 커밋 4개 (2026-08-31): `c03fcea` pnpm 11·의존성 / `67c29c4` 오버레이 Zustand / `aea9e04` 데이터 레이어 / `1145153` 문서
- [x] **PeelSticker 제거 (2026-08-27)** — Skia 셰이더 스티커 데모(827 LOC, 네이티브 의존). 테스트용으로 들어온 것, 템플릿 범위 아님. 폴더·`@shopify/react-native-skia`·allowBuilds 제거, menu-2는 HEAD(Reanimated 예제)로 복원. 복사본은 세션 scratchpad
- [x] `.vscode/settings.json` — Pods 생성물 경로 제거 후 커밋(`8d7c51e`). `docs/superpowers/`는 gitignore(의도)

## A. 지금 끝낼 커밋 큐

아래 순서를 바꾸지 않는다. 각 단계는 관련 파일만 stage하고 `git diff --cached`를 확인한 뒤 커밋한다.

### A1. pnpm 11 마이그레이션

- [~] 전역 pnpm `11.10.0`, `packageManager` `pnpm@11.10.0`
- [~] `onlyBuiltDependencies` → pnpm 11 `allowBuilds`
- [~] Expo 55 당일 버전만 `minimumReleaseAgeExclude`에 버전 한정으로 기록
- [x] `pnpm install` → lockfile 갱신
- [x] frozen 재현 확인 (`CI=true pnpm run check-all`의 install 단계)
- [x] 커밋: `c03fcea chore: pnpm 11 마이그레이션과 의존성 정렬` (A1·A2 통합 — lockfile은 쪼갤 수 없음)

완료 조건: clean install이 pnpm 11에서 재현되고 package manager 변경만 독립적으로 되돌릴 수 있다.

### A2. Expo SDK 55 패치 정렬

- [~] `expo` 55.0.30 및 SDK 55 호환 패치 버전 manifest 반영
- [x] `npx expo install --check` — up to date
- [x] `npx expo-doctor` — 18/18
- [x] 커밋: A1에 통합(`c03fcea`), 이후 SDK 57로 대체(`959c596`)

완료 조건: Expo가 권장 버전 불일치를 보고하지 않고 Doctor가 전체 통과한다.

### A3. Overlay 상태를 Zustand로 정리

- [~] 수제 `useSyncExternalStore` 제거, transient toast를 Zustand store로, React 외부용 `toast.show/hide` 유지
- [x] `CI=true pnpm run check-all`
- [x] 커밋: `67c29c4`

완료 조건: 기존 toast 호출부를 바꾸지 않고 전역 overlay가 한 store를 구독한다.

### A4. API·인증 데이터 레이어 완성

구현됨(작업 트리):

- [~] `types → requests → queries/mutations` 도메인 구조, query fetcher가 `signal`을 axios까지 전달
- [~] 단일 Axios facade + 요청별 `auth: none|required`(기본 none), `required`는 토큰 없으면 네트워크 전 `AUTH_REQUIRED`
- [~] `patch`·`requestRaw`·endpoint별 선택 `parse`
- [~] 모든 실패를 Axios 원본 미보관 `ApiError`로 정규화, 재시도 정책은 query-client로 분리
- [~] refresh single-flight, 토큰 identity 기반 좀비 세션 가드, 확정 거절(400/401/403)만 로그아웃
- [~] 미구현 refresh capability 기본 비활성(`isAuthRefreshConfigured = false`)
- [~] 토큰 저장은 MMKV(JP 동일) — signIn/signOut이 MMKV+state를 동기 기록, hydrate가 검증 후 복원. 2026-08-26 Codex 세션의 `expo-secure-store` 도입은 검토 후 제거(사유 data-layer.md 거부된 대안)
- [~] **세션 출구 단일화**: `_layout`이 signedIn→signedOut 전이를 구독해 `queryClient.clear()` + 내비 리셋. 수동 로그아웃과 refresh 실패가 같은 문으로 나간다. `use-logout.ts` 삭제(소비처 0). 전용 훅 파일·`Stack.Protected` 안은 검토 후 폐기(사유 data-layer.md)
- [~] `use-navigation-reset`의 `__root`가 expo-router 내부값임을 주석으로 고정(업그레이드 확인 지점)

남은 것:

- [x] `TODO(앱)` 4곳 유지 확인 — `app/_layout.tsx` · `lib/auth/refresh-request.ts` · `lib/api/client.ts` · `lib/api/query-client.ts`, `data-layer.md` "채우는 곳"과 1:1 (2026-08-26 grep)
- [x] `CI=true pnpm run check-all` · development iOS export — 2026-08-26 통과
- [x] **결정 — `auth: 'required'` 배선은 앱 안에서 시연하지 않는다.** 서버 로직(AT/RT 발급·검증)은 앱 몫이고 템플릿은 endpoint·속성 매칭 지점(`refresh-request.ts`, `signIn(tokens)`)만 제공한다. 예제 화면에 가짜 로그인 버튼을 넣는 안은 거부. 401→refresh→재시도는 앱이 `refresh-request.ts`를 채울 때 그 앱에서 검증한다 (의도적 미검증, data-layer.md에 기록됨)
- [x] **결정 — `expo-secure-store` 미채택.** Keychain 성질(~2KB·재설치 잔존·비동기 삭제)이 얹던 결정 3개와 `usesNonExemptEncryption` 항목은 함께 소멸. 토큰은 JP처럼 MMKV
- [x] lib/auth 로직 재검증 — 2026-08-26 스크래치 하네스 9/9 (실제 `lib/auth/index.ts`·`auth-store.ts`·`storage`·`api-error` 로드, `react-native-mmkv`와 `./refresh-request`만 목): RT 없음 거절 / single-flight 1회 / RT 보존 / 좀비 가드 / 계정 전환 가드 / 401만 로그아웃 / 네트워크·5xx 세션 보존 / 해제 후 재요청 / hydrate 검증·정리. 하네스는 커밋하지 않음(템플릿 정책). 재현 레시피: `node --require tsx/cjs run.cts` + `Module._resolveFilename` 래핑으로 specifier→가짜 경로, `Module._cache`에 목 주입 (tsx는 이 레포에서 `.ts`를 CJS로 변환하므로 `--import tsx`·ESM 훅은 안 통함)
- [x] 커밋: `aea9e04`

앱 TODO: refresh endpoint와 응답 shape, 만료 status, query retry 정책, 로그인 화면, 보호 구역 가드, 세션 출구 reset route.

완료 조건: 새 도메인이 `src/api/example`을 복사해 서버 계약만 채우면 되고, 공개 요청과 인증 필수 요청의 경계가 기본값으로 안전하며, 인증 사이클 배선은 앱이 refresh endpoint를 채울 때 검증한다.

### A6. 문서 동기화

- [~] `docs/data-layer.md` — 설계 이유·`TODO(앱)`·세션 출구·거부 대안(Stack.Protected, 전용 훅 파일)·보호 구역 가드·인터셉터 확장 규칙 반영
- [x] `data-layer.md` "스토어 읽기 규칙 … auth-store 헤더 주석에도 있음" — MMKV 복귀 시 헤더 주석 복원으로 다시 참
- [x] `data-layer.md` "검증 상태" 절 → 2026-08-26 재실행 결과로 교체
- [x] `decisions.md` 데이터 레이어 절 — 세션 출구 한 줄 추가
- [x] `handoff.md` §7–8 정합 — #15 get-error-message→api-error, #16 인터셉터 라우팅→세션 출구·구역 가드, #19 Jest+RNTL→테스트 인프라 미포함 결정, reset 호출처 갱신
- [x] 순간 상태(커밋 수, suite 수, 임시 경로) — grep 결과 없음, 해당 없음
- [x] 잔재 삭제: `src/hooks/.gitkeep` `src/utils/.gitkeep`
- [x] README 검증 명령·폴더 구조 재확인 — 데이터 레이어 한 줄만 MMKV token으로 정정
- [x] 커밋: `1145153`

완료 조건: 새 사용자가 README와 데이터 레이어 문서만 읽고 시작할 수 있고, 세 문서(data-layer·decisions·handoff)가 서로 모순되지 않는다.

## B. 현재 시뮬레이터에서 사용자 확인

에이전트는 새 Simulator나 device를 띄우지 않는다. 0 해소 + A 게이트 green 뒤에 요청한다.

### B1. NativeTabs

- [ ] 탭 아이콘은 현재 것을 그대로 둔다(자리표시). 교체 컨벤션은 `constants/tabs.ts` 헤더 + `pnpm icons:tabs`(`scripts/gen-tab-icons.sh`, SVG 1장→PNG 6장) — 시뮬에서는 기본/선택 PNG 쌍이 바뀌는지만 확인
- [ ] 선택 라벨 색과 Liquid Glass 전환 확인
- [ ] 하단 safe area와 탭 이동 확인
- [ ] fallback 환경에서 선택 색, 터치 영역, 하단 inset 확인
- [ ] 중립 라벨 5개(HOME/MOTION/STACK/DYNAMIC/SETTINGS) 잘림 없이 표시 — NativeTabs·fallback 둘 다
- [ ] SETTINGS 탭 테마 토글 동작, STACK 탭 → detail push/back, HOME Image 로컬 렌더, Pressable → toast

### B3. API 예제

레이어 검증(2026-08-27, 스크래치 하네스 — 실제 `client.ts`, 로컬 에코 서버만·외부 호출 0, 8/8): `auth` 기본 none 무헤더(로그인 상태여도), required Bearer 첨부 / 토큰 없으면 네트워크 전 AUTH_REQUIRED, parse 실패·네트워크·서버 본문 message/code 정규화, required 401 + refresh 미구성 → 세션 보존, FormData Content-Type. env 체계 13/13(3환경 해석·정적값 통과·malformed record throw·production `.invalid` 부팅 throw·잘못된 APP_ENV throw·STRICT 요약 로그·client baseURL=Env.urls.api·env-candidates import 0·src의 process.env 0). import 방향 정적 확인(store/storage → lib/api·lib/auth 0). 예제 API(jsonplaceholder) 자체는 검증 대상이 아님 — 아래는 **화면 표시** 확인만.

- [ ] regular query와 suspense query 성공 확인
- [ ] mutation과 refetch 확인
- [ ] 잘못된 응답(`parse` 실패)·네트워크 실패의 `ApiError.message` 표시 확인
- [ ] 공개 요청에 Authorization이 붙지 않는지 확인

## C. 템플릿 마감

### C1. 스타터 화면 — 완료 (2026-09-03)

- [x] **결정**: 첫 실행 화면 = 컴포넌트 카탈로그 유지(템플릿 가치 = UI 킷 시연, 사용자는 `home-screen.tsx` 하나 지우고 시작). 탭은 중립 라벨 + 5개
- [x] 탭 라벨 화면 의미로 정렬: HOME / MOTION(Reanimated) / STACK(중첩) / DYNAMIC(동적 라우트) / SETTINGS. 라우트 폴더 `menu-N`·아이콘은 자리표시 유지
- [x] menu-5 Placeholder → Settings(테마 토글) 실화면 승격, `Placeholder` 컴포넌트 삭제(사용처 0)
- [x] menu-3 중첩 예제의 하위 화면 settings → 일반 `detail` (Settings 중복 제거)
- [x] home `console.log` → toast, Picsum 외부 의존 → 로컬 `react-logo.png`
- [x] README "SDK 55" 문구 2곳 → 57

### C2. 부팅과 splash — 구현 완료, **시뮬 검증 대기** (커밋 전, `docs/boot.md`)

- [x] theme, query listener, auth hydration 동기 초기화 (① 층)
- [x] **결정**: OTA 기본 제공 = **hot-updater**(KR/JP 표준, 자체 서버). expo-updates 거부. `Env.urls.ota` 비면 비활성
- [~] 팝업 오버레이(`popup.confirm` Promise 표면)
- [~] 프리로더 엔진 + splash 라우트 + 프리페치 (하네스 13/13)
- [~] hot-updater 통합(어댑터·플러그인·CLI 설정·배포 스크립트)
- [~] 딥링크 모듈 — 뼈대만(캡처·큐·라우트 테이블·native-intent, 하네스 10/10). 게이트·보류 재생은 프로젝트 정책으로 제외
- [~] 문서: docs/boot.md + decisions/handoff/data-layer/README/AGENTS
- [x] **iOS 네이티브 splash 흰색 버그 수정(2026-09-03)**: `expo-splash-screen` 플러그인에 `image` 를 `android` 밑에만 두면 SDK 57 iOS storyboard 는 imageView 를 제거하고 배경색을 `systemBackgroundColor`(흰색)로 남긴다(플러그인 `applySplashScreenStoryboard` 동작) → JS splash(#208AEF)와 이음새 깨짐. `image`·`imageWidth` 를 루트로 이동 → storyboard 에 imageView + `SplashScreenBackground`(#208AEF) 확인(`prebuild --clean --no-install`)
- [x] **dev client 흰 화면 해소 확인(2026-09-07, 사용자 Android 빌드·실행)**: 2026-09-03 에 `_layout.tsx` 청크가 Metro 에 요청조차 되지 않아 흰 화면이던 증상이 재현되지 않는다. 그 사이 변경 중 유력한 원인은 `unstable_settings.anchor` 복원 — 당시엔 anchor 가 제거된 상태였고 expo-router 는 라우트 노드의 `initialRouteName` 을 `unstable_settings` 에서만 만든다(`routing.md` "anchor")
- [ ] **시뮬(사용자) — 커밋의 마지막 관문**: `npx expo prebuild -p ios` 후 `pnpm ios`(ios/ 는 splash 수정으로 재생성됨, Pods 는 run:ios 가 설치) → 콜드 부팅 splash→tabs 이음새 · dev에서 `[Preloader/ota] skipped` 로그 · `xcrun simctl openurl booted <scheme>://menu-4/42` 콜드(앱 종료 후 → splash 거쳐 detail)/웜(즉시) · 홈 Overlays의 Popup confirm · 강제 업데이트는 `fetchForcedUpdatePolicy` 스텁을 잠깐 outdated로 바꿔 팝업·스토어 이동 1회 확인 후 복원
- [ ] 검증 후 커밋 5개(팝업 / 프리로더·splash / OTA / 딥링크 / 문서) — 관련 파일만 stage
- 앱 TODO: `urls.ota`·S3 버킷·AWS 키·정책 API·권한 주입·프리페치 목록·딥링크 호스트/라우트 (`docs/boot.md` 표)

### C2b. 푸시 알림 — 구현 중 → **시뮬 검증 대기** (커밋 전, `docs/push.md`)

- [x] **SDK 57 호환성 검수(2026-09-03)**: KR/JP 네이티브 스택 매트릭스 — 깨지는 8개(nitro <0.37 · restart 0.0.27 · moti · render-html · community/blur · notifee 아카이브 · hot-updater 서버 0.30 · deploymentTarget 16.0), 경고 수준 9개, hot-updater 0.30→0.36 체크리스트(서버 import 경로·routes.bundles opt-in·db migrate·infra floor 0.33). Airbridge는 템플릿 제외(KR 전용, AppDelegate 앵커 `import Expo` → `internal import Expo` 정규식 1줄)
- [x] **결정**: RNFB **26.3.3 exact**(RN 0.86 CI 검증 유일) + **notify-kit 10.7 FCM Mode**(notifee 포크, Android data-only·iOS alert+NSE — 중복/유실 구조적 해소) + react-native-permissions 5.6 하나 + NSE는 notify-kit 플러그인(apple-targets 제외). 활성화 = `firebase/` 파일 존재. iOS static + `$RNFirebaseDisableSPM` 무조건(flavor 하나). 참조 앱 결함 D1(권한 전 토큰)·D2(로그아웃 재등록)·D3(채널 지연)·D4/D5(탭 이벤트 누락)·D6(이중 enqueue)·D10(권한 API 3종)·D13(채널 문자열 3곳) 수정
- [~] deps 설치 + allowBuilds(`@firebase/util`·`protobufjs` false) 기록
- [~] `index.js` custom entry(headless) · `firebase.json` · `firebase/README.md` · `constants/push`
- [~] `lib/push/{core,background,taps,permission,token-sync}` · dispatcher 보강 2줄(splash 열림 → cold 강제, markHandled 선행) · use-deep-link/splash/sources 배선 · app.config 게이트 · 홈 Push 시연 버튼
- [x] 하네스 구성 15/15 · 미구성 11/11 (token-sync 상태기계 D1/D2·extract-url·background 가드·dispatcher dedup·permission 사다리) · `check-all` · `expo config` 3회 게이트(파일 0/더미 2/STRICT+1 throw) · `expo export -p ios`(custom entry) 통과. hot-updater doctor 는 stale `ios/`·fingerprint.json 부재 3건(entry 무관, prebuild 후 재확인)
- [x] 게이트: frozen install · `check-all` · expo-doctor 18/18 · `expo install --check` up to date (2026-09-03)
- [x] 실빌드(2026-09-03, 푸시 off): `CI=1 expo prebuild --clean -p ios` → pod install이 `$RNFirebaseDisableSPM = true` 인식("SPM disabled, using CocoaPods") + static → `run:ios --device` **Build Succeeded**(RNFB 26.3.3·notify-kit 10.7·permissions 5.6 on RN 0.86.3, 0 error / 경고 3: RNFB Core Configuration·Dev Launcher 스크립트 의존성 — 무해). 17 Pro Max에 설치·실행
- [x] 부팅 로그: 번들 `index.js` 엔트리 로드 · headless `[push] disabled — Firebase 미구성(getApps()=0)` 출력 · 크래시 없음. 그 이후(프리로더·권한 다이얼로그·홈 Push 버튼)는 사용자 QA 에서 확인 — 흰 화면은 2026-09-07 해소됨(위 C2)
- [ ] **시뮬(사용자) — 커밋의 마지막 관문**: 첫 부팅 권한 다이얼로그 1회 · 홈 Push 버튼 → 배너 → 탭 → menu-4/42(fg, enqueue 1회) · 백그라운드 탭 · 앱 종료 후 `xcrun simctl push <UDID> <bundleId> p.apns`(aps.alert + deep_link) → splash 거쳐 detail, navigate 1회 · C2 항목 재확인
- [ ] 검증 후 커밋 2개(feat 푸시 / docs) — C2 5커밋 뒤에. C2 시점 스냅샷은 세션 scratchpad `c2-snapshot/`
- 앱 TODO: Firebase 파일 3환경·APNs 키·토큰 어댑터(등록/해제 API)·로그아웃 전 `unregisterPushToken()`·서버 `buildNotifyKitPayload`·배지/권한 blocked UX·small icon·NSE 서명 (`docs/push.md` 표)
- 의도적 미검증: 실기 FCM·APNs·NSE 이미지(Firebase 프로젝트 필요), 푸시 on 빌드(사용자가 dev 설정 파일 제공 시만), Android 활성 빌드(패키지명 일치 json 필요)

### C2c. app.config 플러그인 이식 — 구현 완료, 빌드 검증 대기 (2026-09-03, 매핑표 `docs/config.md` "Config plugins")

- [x] KR/JP `plugins`·`ios`·`android` 블록 항목 단위 대조 → 제네릭만 이식: `appleTeamId`(.env 선택) · 유니버설 링크(`DEEP_LINK_HTTPS_HOSTS` 한 곳에서 `associatedDomains`+`intentFilters` 파생) · `app-icon-badge`(dev/preview 배지) · `plugins/with-plugin.ts`(→ `with-android-plugin.ts` · `with-ios-plugin.ts`)(폴더블 + production release 서명 Gradle env) · proguard. 제외 사유는 매핑표
- [x] 검증: `check-all` · `expo config --type prebuild`(플러그인 6종 순서, 호스트 비었을 때 associatedDomains/intentFilters 미설정) · `prebuild -p android --no-install` → MainActivity `configChanges`/`resizeableActivity` 적용, 배지 아이콘 생성, dev 에서 서명 블록 미주입 · `patchAppBuildGradle` 단위 테스트(release 블록 주입·buildTypes.release 교체·debug 유지·멱등)
- [x] **표시명 분리 이식(2026-09-07, 사용자 지시)**: 한글·일본어 앱 이름은 `name` 에 넣을 수 없다 — prebuild 의 `sanitizedName()` 이 `/[\W_]+/g`(u 플래그 없음)로 지워 `워크아웃`→iOS 프로젝트 `app`, `워크아웃 KR`→`KR` 이 된다(실측표는 `decisions.md` "표시명"). KR `with-display-name` 방식을 `Env.identity.displayName` 한 곳으로 이식: iOS `CFBundleDisplayName`(app.config) + Android `app_name`(`with-android-plugin` 의 `withStringsXml`), `rootProject.name`·Xcode 프로젝트명은 ASCII `name` 유지. 비우면 Expo 기본. `prebuild -p android` 로 mod 실행 순서 확인
- [ ] 빌드(사용자 QA 또는 다음 세션): Android `pnpm android`(SDK 57 첫 빌드 — compileSdk 36, notify-kit 35 경고 예상) · iOS 는 `prebuild` 후 배지 아이콘·appleTeamId 반영 확인 · production 프리빌드는 env 가 `.invalid` API 를 거부하므로 앱에서
- 앱 TODO: `.env` `APP_BUILD_ONLY_APPLE_TEAM_ID` · 유니버설 링크 호스트 · release 키스토어(`ANDROID_UPLOAD_*`) · 표시명이 non-ASCII 면 `CFBundleDisplayName` + Android `app_name` 분리(KR `with-display-name` 참고) · 브랜드 폰트(`expo-font` fonts)

### C2d. 프레임 정렬 — KR 뼈대 이식(SDK 57 대응), 구현·컴파일 검증 완료, **시뮬 QA 대기** (2026-09-03)

- [x] KR `app.config`·루트 설정·src 인프라를 파일 단위로 대조(Explore 매핑) → 제네릭만 이식: pnpm **hoisted** 링커(`.npmrc` + `nodeLinker`, KR·Expo 권장; stale 55.x releaseAge 제거) · `_layout` 모듈 스코프 `configureReanimatedLogger`·`enableFreeze(true)` · `unstable_settings.anchor` → `'splash'`(2026-09-07 정정: 한때 제거했으나 값이 틀린 것이지 메커니즘이 틀린 게 아니었다 — 아래 "anchor" 절) · `experiments.reactCompiler` 제거(KR = typedRoutes 만) · `KeyboardProvider` · `react-native-network-logger` + dev FAB(`/dev/network-logger`) · `firebase.json` messaging 키 · prettier 설정+스크립트(`format:check` 75파일 대기, `--write` 는 별도 커밋) · 스크립트 체계(`start*`, `prebuild`=rm -rf, `ios|android:development`, `:release`) · `.gitignore` · `expo-localization` 초기 언어
- [x] SDK 57 Δ 반영: dev-client `launchMode:'most-recent'` 는 57 기본값(플러그인 자동 적용) → 추가 안 함, `developmentClient.silentLaunch` 는 Expo Go 전용 죽은 키 · React 19 `Text.defaultProps` 불가 → `Text`/`Input` 컴포넌트 기본 `allowFontScaling=false` · `@react-navigation/*` 직접 import 없음 · `__mocks__/react-native-gesture-handler` 경로 2.32 대응
- [x] **테스트는 레포에 넣지 않는다(2026-09-07, 사용자 지시 — A5·`handoff.md` #19 원래 결정 유지)**: 부팅/푸시/딥링크 검증용 jest 스위트(최종 17 스위트 123 케이스)는 세션 내에서 작성·실행하고 커밋 전 제거했다. jest 인프라(`jest.config.js`·`jest-setup.ts`·`__mocks__/`·devDeps 4종·`test`/`test:ci` 스크립트) 미포함, `check-all` = lint + tsc. 앱이 필요하면 그때 추가한다(`decisions.md`: 대상 옆 colocated `x.test.tsx`, `__tests__/` 폴더 금지). 남는 코드 사실: mmkv 목은 `remove` 가 필요하다(lib/storage.removeItem), `bindContext` 는 큐를 비우지 않는다(의도), `onProgress` 는 시도 기준 카운트
- [x] 게이트: frozen install · check-all · doctor 18/18 · `expo install --check` · export · iOS/Android prebuild
- [x] **컴파일 전용 빌드(시뮬 미설치)**: iOS pod install(hoisted, 135 pods: ExpoLogBox·RNNotifee 10.7·RNFB 26.3.3·keyboard-controller 1.21.9·RNPermissions·HotUpdater) + `xcodebuild` BUILD SUCCEEDED · Android SDK 57 첫 빌드 `assembleDebug` 성공(compileSdk 36)
- [ ] **시뮬(사용자)**: `pnpm ios:development`(ios/ 는 방금 생성됨; 처음부터면 `pnpm prebuild:development` 먼저) → ① 로고 아래 `js splash · <stage> n/m` 표식 유무(없으면 루트 렌더 미도달 → Metro `j` DevTools 콘솔 확인) ② splash → 탭 ③ 알림 권한 다이얼로그 ④ 홈 Push 버튼 → 배너 → 탭 → menu-4/42 ⑤ dev 아이콘 배지·네트워크 로거 FAB ⑥ Android `pnpm android:development`
- [x] **프리로더 KR 원본 이식(2026-09-03, 사용자 지시)**: 템플릿 재구현(타임아웃·OtaAdapter·주입 옵션) 제거 → KR `lib/preloader/*`·`permissions/*`·`splash-initializer`·`utils/show-*-popup`·`lib/api/prefetch` 그대로(대조 검증: `boot.md` "프리로더 이식 검증" — 로직 드리프트 0). 허용 변경: Env 경로·auth `status`·`api/app` 스텁·popup.confirm·OTA URL 가드. 인트로 게이트 `features/splash/intro-gate.ts`(KR 영상 자리, 기본 최소 노출 1s, TODO(앱) 영상)
- [x] **딥링크 안전 탈출 계보 복원(2026-09-04, 사용자 지시)**: KR `gates/index.ts`(runGates·GATE_MAP) · `RouteHandler.gates`/`safeFallbackExpoPath` · `peekSafeFallback()` · `enqueueOrFallback()` · splash `goToTabs` safeFallback 분기 이식. 발견된 구멍: 미등록 링크 콜드 진입 시 dispatcher noop → splash 잔류(`peekSafeFallback` 로 해소). 템플릿 추가 가드: cold navigate throw → `SAFE_FALLBACK_PATH` replace
- [x] **딥링크 모듈 KR 파일 단위 이식(2026-09-04, 사용자 지시)**: parser(웹 경로 정규화 테이블·선행 슬래시 없는 KR 경로 규약) · matcher 엔진(인덱스·DYNAMIC queryDriven→STATIC→EXTERNAL_WEB→DYNAMIC·inferResetFromTo·whenAuthenticated·외부 웹페이지) · 스펙 테이블 `constants/deep-link.ts`(예제 1개씩) · gates/auth(deferred) + pending-intent + `providers/auth-deferred-runner` · native-intent 전체(safeFallback→auth→expoPath) · extractors 복원 · dispatcher `enqueueExternalSdkUrl`. 유일한 구조 변경: KR 라우트별 bespoke 동적 핸들러 switch → 제네릭 기본(cold replace / 외부 navigate / 인앱 push) + `spec.navigate` 오버라이드(KR 시그니처). 결정: headless 체인의 스토어 import 허용(KR 동일; React·화면만 금지). `/auth/login`·`/external-web` 라우트는 TODO(앱)
- [x] **iOS 26 NativeTabs 하드코딩 OFF(2026-09-04, 사용자 지시)**: `(tabs)/_layout.tsx` `USE_LIQUID_GLASS_TABS = false` — 모든 플랫폼 JS CustomTabsLayout. 활성화는 상수를 `isLiquidGlassAvailable()` 로 되돌리기(파일 주석)
- [ ] 커밋(QA 뒤): 툴링·의존성 1개 → C2 5개 → 푸시 2개 → 프레임 정렬 1개 → (별도) `pnpm format` 1개

### C3. 설정과 onboarding

- [x] `write-your-*` identity 교체 체크리스트 — README "Make it yours" §1 표(6필드). `name` 은 ASCII 유지, 한글·일본어 표시명은 `displayName` 에 (사유 `config.md` "표시명")
- [x] production API URL 교체 체크리스트 — README §2. `env.ts` 가 production `.invalid` 를 부팅 시 throw 하는 것이 방어이고, 문서는 그 동작이 **의도**임을 밝히는 역할
- [x] **결정 — EAS 는 열어만 둔다(2026-09-07, 사용자 지시).** 템플릿은 `eas.json` 을 넣지 않고 `owner`·`extra.eas.projectId` 는 주석 이음새로 남긴다 — **활성화는 파일 존재로 갈린다**(푸시의 `firebase/`, OTA 의 `urls.ota` 와 같은 관용구). 참조 앱 KR/JP 는 안 쓴다. 기본 경로는 로컬 프리빌드 + `run:ios/android`(`:release`), Android 서명은 `with-android-plugin` 의 Gradle env, iOS 는 `appleTeamId`/Xcode. README §5 · `config.md` "EAS"
- [x] `.env`는 항상 존재 — `postinstall`이 `.env.example`에서 자동 생성 (2026-08-27, CI/frozen 유무 모두 실행 확인). `.env.example` 마지막 줄은 `=` 없는 주석 유지 — Node 23 `util.parseEnv`(Expo CLI 사용)가 파일 마지막 주석 줄에 `=`가 있으면 변수로 읽는 버그 우회
- [x] `.env` 예시 시크릿 `APP_BUILD_ONLY_EXAMPLE_SECRET` + `app.config.ts`의 `requireInStrict()` 복원(초기 커밋에 있던 것, 5767693에서 유실). STRICT 마스킹 표시·누락 시 throw/warn·공개 config 누출 0 확인 (2026-08-27)
- [x] `.env.example`·app config·CNG 규칙 연결 — README §6. `.env`=빌드 시크릿 전용 · 런타임 공개값은 `env-candidates` · `STRICT_ENV_VALIDATION=1` 스크립트 · `ios`/`android` 는 산출물(직접 수정 금지, `plugins/` 로) · `.env.example` 마지막 줄 `=` 없는 주석 유지. README §3(에셋)·§4(빈 값=비활성 표)도 같이 추가

### C4. 자동화와 릴리즈

- [x] **결정 — CI 워크플로는 넣지 않는다(2026-09-07, 사용자 지시).** 게이트는 로컬 `pnpm run check-all`. 받는 팀이 자기 파이프라인을 붙인다.
- [ ] CHANGELOG와 tag 기반 릴리즈 절차
- [x] **clean clone 전체 검증(2026-09-07)** — 새 폴더에 clone → frozen install → check-all → doctor → iOS export.
      `ios`/`android`/`.env`/`node_modules`/`.expo`/`fingerprint.json` 이 clone 에 없는 것 확인,
      postinstall 이 `.env` 생성. **실패 1건 발견·수정**: `tsc` 가 `'../global.css'` 선언을 못 찾았다 —
      `*.css` 선언은 `expo/types/global.d.ts` 에만 있고 그 진입점 `expo-env.d.ts` 는 gitignore 대상이라
      clean clone 에 없다. `src/types/css.d.ts` 에 `declare module '*.css'` 를 넣어 해결(expo-env.d.ts 가
      있는 환경에서도 중복 충돌 없음을 양쪽에서 확인). doctor 는 SDK 패치 3개 밀림(별건).

### C5. create-my-stack CLI

- [ ] A~C4 완료 뒤 시작
- [ ] app name, slug, scheme, bundle id/package 결정적 치환
- [ ] template download와 pnpm install, 실패 시 생성 폴더 cleanup
- [ ] 생성 앱에서 check-all, Expo Doctor, export 검증

## D. 완료 정의 — 이 템플릿이 "끝"인 조건

**v1.0 (템플릿으로 배포 가능)**

1. clean clone → `pnpm install --frozen-lockfile` → `CI=true pnpm run check-all` → `npx expo-doctor` → `npx expo export -p ios` 전부 green
2. 작업 트리 clean — A1~A6(A5 삭제)의 모든 `[~]`가 커밋됨
3. B1·B3 사용자 확인 완료
4. `grep -rn "TODO(앱)"` 결과가 섹션 문서 "채우는 곳" 표와 1:1
   — **2026-09-07 대조 완료(0건 불일치).** 마커 26개 파일 전부 소관 문서 표에 행이 있다.
   보강한 것: `constants/push.ts`·`lib/push/background.ts` 행 신설, `lib/push/taps.ts` 행에
   invalidate 추가(push.md) · `lib/deep-link/dispatcher.ts` 행 신설(boot.md) ·
   `utils/show-*-popup.ts`(팝업 카피)·`constants/tab-routes.ts`(탭 구성)에 마커 추가.
   코드 마커가 **없는 것이 의도**인 표 행 2개는 그렇게 표시했다: `firebase/`(파일을 두는
   디렉터리) · `lib/preloader/permissions/`(KR verbatim 이라 손대지 않는다).
   소관은 `AGENTS.md` 의 폴더→문서 매핑을 따른다.
5. A4의 결정(SecureStore 미채택·required 미시연)이 `decisions.md`/`data-layer.md`에 기록됨이 `decisions.md`에 기록됨
6. C1 잔재 0, C2 OTA 결정 기록, C2b 푸시 결정 기록, C3 온보딩 체크리스트 존재
7. 새 사용자가 README + `data-layer.md`만으로 identity·API URL을 교체하고 실행할 수 있다

**v1.x** — C4 CI·릴리즈 절차 → **v2** — C5 CLI

## 공통 커밋 게이트

1. 관련 파일만 명시적으로 stage한다.
2. `git diff --cached --check`와 `git diff --cached --name-status`를 확인한다.
3. 의존성 변경은 frozen install을 확인한다.
4. 소스 변경은 `CI=true pnpm run check-all`을 확인한다.
5. 네이티브 의존성 변경은 Expo Doctor와 iOS export를 확인한다.
6. UI 변경은 사용자에게 현재 시뮬레이터의 정확한 확인 항목만 요청한다.
7. 업그레이드, 기능, 문서를 서로 다른 커밋으로 기록한다.
