# 템플릿 완성 TODO

> 마지막 감사: 2026-07-28 — 작업 트리 실측 기준 (문서 주장이 아니라 파일·명령 결과로 확인한 것만 적음)
> 이 문서가 구현 순서와 완료 상태의 단일 기준이다. 세부 설계 근거는 `docs/data-layer.md`, `docs/decisions.md`.

## 상태

- `[x]` 완료 및 검증됨
- `[~]` 작업 트리에 구현됨, 커밋 또는 최종 검증 대기
- `[!]` 외부 승인이나 환경 복구가 필요함
- `[ ]` 아직 시작하지 않음
- `결정` 코드가 아니라 판단이 필요한 항목. 결정 내용을 `decisions.md`에 한 줄 남기고 닫는다
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
- [ ] 사용자 시뮬 확인(dev client 재빌드 `pnpm ios` 필수): B1 탭(iOS26 + Android selected 아이콘 — SDK 56부터 지원), B3 API 화면, menu-2 Reanimated 예제, Dimmed blur 시감
- [ ] 확인 후 커밋 3개: chore(deps·config·AGENTS) / refactor(react-navigation→expo-router) / fix(lint 규칙·expo-blur)

## 현재 위치

- [x] `6b7c225` NativeTabs 아이콘과 fallback 커밋
- [x] `5f0da26` 로컬 로그·도구 산출물 ignore 커밋
- [~] API/auth, Zustand overlay, 세션 출구, 탭 아이콘 컨벤션 — 작업 트리에 있음, 게이트 green, 시뮬 확인·커밋 대기
- [x] **PeelSticker 제거 (2026-08-27)** — Skia 셰이더 스티커 데모(827 LOC, 네이티브 의존). 테스트용으로 들어온 것, 템플릿 범위 아님. 폴더·`@shopify/react-native-skia`·allowBuilds 제거, menu-2는 HEAD(Reanimated 예제)로 복원. 복사본은 세션 scratchpad
- [ ] `.vscode/settings.json`은 사용자 로컬 변경이라 커밋하지 않음. `docs/superpowers/`는 gitignore됨(의도)

## A. 지금 끝낼 커밋 큐

아래 순서를 바꾸지 않는다. 각 단계는 관련 파일만 stage하고 `git diff --cached`를 확인한 뒤 커밋한다.

### A1. pnpm 11 마이그레이션

- [~] 전역 pnpm `11.10.0`, `packageManager` `pnpm@11.10.0`
- [~] `onlyBuiltDependencies` → pnpm 11 `allowBuilds`
- [~] Expo 55 당일 버전만 `minimumReleaseAgeExclude`에 버전 한정으로 기록
- [x] `pnpm install` → lockfile 갱신
- [x] frozen 재현 확인 (`CI=true pnpm run check-all`의 install 단계)
- [ ] 커밋: `chore: pnpm 11 설치 정책 정리`

완료 조건: clean install이 pnpm 11에서 재현되고 package manager 변경만 독립적으로 되돌릴 수 있다.

### A2. Expo SDK 55 패치 정렬

- [~] `expo` 55.0.30 및 SDK 55 호환 패치 버전 manifest 반영
- [x] `npx expo install --check` — up to date
- [x] `npx expo-doctor` — 18/18
- [ ] 커밋: `chore: Expo SDK 55 패치 의존성 정렬`

완료 조건: Expo가 권장 버전 불일치를 보고하지 않고 Doctor가 전체 통과한다.

### A3. Overlay 상태를 Zustand로 정리

- [~] 수제 `useSyncExternalStore` 제거, transient toast를 Zustand store로, React 외부용 `toast.show/hide` 유지
- [x] `CI=true pnpm run check-all`
- [ ] 커밋: `refactor: 오버레이 상태를 Zustand로 통합`

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
- [ ] 커밋: `feat: API와 인증 데이터 레이어 완성`

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
- [ ] 커밋: `docs: 템플릿 완료 상태와 데이터 레이어 문서화`

완료 조건: 새 사용자가 README와 데이터 레이어 문서만 읽고 시작할 수 있고, 세 문서(data-layer·decisions·handoff)가 서로 모순되지 않는다.

## B. 현재 시뮬레이터에서 사용자 확인

에이전트는 새 Simulator나 device를 띄우지 않는다. 0 해소 + A 게이트 green 뒤에 요청한다.

### B1. NativeTabs

- [ ] 탭 아이콘은 현재 것을 그대로 둔다(자리표시). 교체 컨벤션은 `constants/tabs.ts` 헤더 + `pnpm icons:tabs`(`scripts/gen-tab-icons.sh`, SVG 1장→PNG 6장) — 시뮬에서는 기본/선택 PNG 쌍이 바뀌는지만 확인
- [ ] 선택 라벨 색과 Liquid Glass 전환 확인
- [ ] 하단 safe area와 탭 이동 확인
- [ ] fallback 환경에서 선택 색, 터치 영역, 하단 inset 확인

### B3. API 예제

레이어 검증(2026-08-27, 스크래치 하네스 — 실제 `client.ts`, 로컬 에코 서버만·외부 호출 0, 8/8): `auth` 기본 none 무헤더(로그인 상태여도), required Bearer 첨부 / 토큰 없으면 네트워크 전 AUTH_REQUIRED, parse 실패·네트워크·서버 본문 message/code 정규화, required 401 + refresh 미구성 → 세션 보존, FormData Content-Type. env 체계 13/13(3환경 해석·정적값 통과·malformed record throw·production `.invalid` 부팅 throw·잘못된 APP_ENV throw·STRICT 요약 로그·client baseURL=Env.urls.api·env-candidates import 0·src의 process.env 0). import 방향 정적 확인(store/storage → lib/api·lib/auth 0). 예제 API(jsonplaceholder) 자체는 검증 대상이 아님 — 아래는 **화면 표시** 확인만.


- [ ] regular query와 suspense query 성공 확인
- [ ] mutation과 refetch 확인
- [ ] 잘못된 응답(`parse` 실패)·네트워크 실패의 `ApiError.message` 표시 확인
- [ ] 공개 요청에 Authorization이 붙지 않는지 확인

## C. 템플릿 마감

### C1. 스타터 화면

- [ ] `features/menu-5/menu-5-screen.tsx:4` Placeholder 제거
- [ ] `features/home/home-screen.tsx:195` 의미 없는 `console.log` 제거
- [ ] `features/home/home-screen.tsx:203` 외부 Picsum 의존 → 로컬 asset 또는 fallback 있는 예제
- [ ] 탭 이름과 예제 화면 의미 정렬
- [ ] 첫 실행 화면을 최소 starter와 UI catalog 중 하나로 확정

### C2. 부팅과 splash

- [x] theme, query listener, auth hydration 동기 초기화
- [x] SDK 55 splash config 적용
- [x] 존재하지 않는 async preloader 계획을 코드에서 제거
- [ ] `결정` OTA를 기본 제공할지
- [ ] OTA를 채택할 때만 `expo-updates`와 splash lifecycle 구현

### C3. 설정과 onboarding

- [ ] `write-your-*` identity 교체 체크리스트
- [ ] production API URL 교체 체크리스트 (`env.ts`가 production `.invalid`를 부팅 시 throw하도록 이미 방어함 — 문서만)
- [ ] EAS owner/projectId 설정 안내
- [x] `.env`는 항상 존재 — `postinstall`이 `.env.example`에서 자동 생성 (2026-08-27, CI/frozen 유무 모두 실행 확인). `.env.example` 마지막 줄은 `=` 없는 주석 유지 — Node 23 `util.parseEnv`(Expo CLI 사용)가 파일 마지막 주석 줄에 `=`가 있으면 변수로 읽는 버그 우회
- [x] `.env` 예시 시크릿 `APP_BUILD_ONLY_EXAMPLE_SECRET` + `app.config.ts`의 `requireInStrict()` 복원(초기 커밋에 있던 것, 5767693에서 유실). STRICT 마스킹 표시·누락 시 throw/warn·공개 config 누출 0 확인 (2026-08-27)
- [ ] `.env.example`, app config, CNG 규칙 연결

### C4. 자동화와 릴리즈

- [ ] CI: frozen install → check-all → Expo Doctor → iOS export
- [ ] EAS development/preview/production profile 확정, `eas.json` 추가
- [ ] CHANGELOG와 tag 기반 릴리즈 절차
- [ ] clean clone 전체 검증

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
4. `grep -rn "TODO(앱)" src` 결과가 `data-layer.md` "채우는 곳"과 1:1
5. A4의 결정(SecureStore 미채택·required 미시연)이 `decisions.md`/`data-layer.md`에 기록됨이 `decisions.md`에 기록됨
6. C1 잔재 0, C2 OTA 결정 기록, C3 온보딩 체크리스트 존재
7. 새 사용자가 README + `data-layer.md`만으로 identity·API URL을 교체하고 실행할 수 있다

**v1.x** — C4 CI·EAS·릴리즈 절차 → **v2** — C5 CLI

## 공통 커밋 게이트

1. 관련 파일만 명시적으로 stage한다.
2. `git diff --cached --check`와 `git diff --cached --name-status`를 확인한다.
3. 의존성 변경은 frozen install을 확인한다.
4. 소스 변경은 `CI=true pnpm run check-all`을 확인한다.
5. 네이티브 의존성 변경은 Expo Doctor와 iOS export를 확인한다.
6. UI 변경은 사용자에게 현재 시뮬레이터의 정확한 확인 항목만 요청한다.
7. 업그레이드, 기능, 문서를 서로 다른 커밋으로 기록한다.
