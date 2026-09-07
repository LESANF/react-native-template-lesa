# 부팅 파이프라인 설계 노트 (splash · preloader · OTA · 딥링크 · 프리페치)

> 앱이 켜져서 첫 화면이 뜨기까지의 뼈대를 **왜 이렇게 짰는지** 기록한다. 되돌리거나 "개선"하기 전에 여기부터 읽어라.
> 근거: 참조 앱 KR · 참조 앱 JP의 실운영 코드(2026-09-03 파일 단위 분석). 두 앱은 동일 계보라 이 문서가 그 공통분모다.

## 두 층

```
① 동기 모듈 로드   app/_layout.tsx 모듈 스코프 — React 렌더 전. splash를 거치지 않는 진입(딥링크·푸시)에도 실행
                    loadSelectedTheme · setupReactQueryNativeListeners · hydrateAuth(MMKV 동기)
                    SplashScreen.preventAutoHideAsync() · initHotUpdater()
② 비동기 프리로더   app/splash → lib/preloader — 네이티브 splash 뒤에서 순차 스테이지, 끝나면 (tabs)로
```

### 왜 두 층인가 (2026-06-17 결정 원문 — 현재 구현은 아래 절들)

- ① **Sync module-load** (`app/_layout.tsx` module scope): `global.css`,
  i18n, `loadSelectedTheme`. Runs before React; covers entries that skip the
  splash (deep link / push).
- ② **Async preloader** (`lib/preloader/`, #22): staged pipeline
  (hydrate → forced-update → ota → permissions) + prefetch, behind the splash.
  `preventAutoHideAsync()` in global scope (race-critical: in a hook = too
  late, splash already gone). `hideAsync()` owned by the initializer (app
  enters even on failure). Callbacks injected (DI) = "주입하면 활성화".
  `splash.tsx` = custom preloader route. Modeled on 참조 앱's lib/preloader.

## 파일 지도 & 의존 방향

```
constants/preloader · constants/deep-link      상수(스테이지, 타임아웃, 호스트, 안전 경로)
lib/preloader/                                 KR `lib/preloader` verbatim 이식(2026-09-03, 대조 검증 아래 "이식 검증")
  types.ts          PreloaderCallbacks(주입=활성화) · StageFailure
  core.ts           runPreloader: hydrate → forced-update-check → ota-check → permissions-check 순차, 스테이지별 try/catch 격리, progress n/4
  hydrate.ts        auth 복원 상태 로그(복원 자체는 _layout 모듈 스코프 hydrateAuth)
  forced-update.ts  getAppForceUpdate(api/app — TODO 스텁) → semver → 팝업 → 'update' 면 never-resolve 블록
  ota.ts            HotUpdater.checkForUpdate({fingerprint}) → 팝업 → updateBundle → 1.5s 플로어 → setTimeout(reload,0). __DEV__·urls.ota 비면 스킵
  permissions/      react-native-permissions 기반 requestAllPermissions(알림) — KR 그대로, AppPermission 확장점
  splash-initializer.tsx  useSplashInitializer(): prefetchOnSplash → runPreloader(팝업·권한 내부 배선) → finally hideAsync()
lib/api/prefetch.ts · utils/show-*-popup.ts    KR 위치 그대로(팝업만 overlay-kit → popup.confirm)
features/splash/intro-gate.ts                  인트로 게이트(KR 의 인트로 영상 자리) — 기본 최소 노출 1s, TODO(앱) 영상
lib/deep-link/                                 KR 파일 단위 이식(2026-09-04) — parser(웹 경로 정규화 테이블) → matcher(인덱스·DYNAMIC queryDriven→STATIC→EXTERNAL_WEB→DYNAMIC·inferResetFromTo·whenAuthenticated) → dispatcher(큐·중복제거·콜드 홀드·runGates·peekSafeFallback·enqueueOrFallback·enqueueExternalSdkUrl) → navigate
  gates/            Gate·runGates·GATE_MAP={auth}(deferred: pending-intent 60s + providers/auth-deferred-runner)
  extractors.ts     푸시 payload → url (KR)
constants/deep-link.ts                         스펙 테이블(STATIC_DEEP_LINK_ROUTES·DYNAMIC_ROUTES_SPEC·EXTERNAL_WEB_PAGE_PATTERNS — 예제 1개씩, 채우는 건 앱) + 호스트·안전 경로·AUTH_LOGIN_PATH
lib/push/                                      푸시(docs/push.md) — permission(프리로더 슬롯) · taps/background(탭 → dispatcher) · token-sync
features/splash/                               화면(splash-screen: KR splash.tsx 의 goToTabs·isOtaPending 로직 + 인트로 게이트)
providers/deep-link-runner.tsx                 DeepLinkRunner (QueryProvider 안쪽)
app/splash.tsx · app/+native-intent.tsx        라우트 재export · OS 링크 가로채기
hot-updater.config.ts · scripts/ota-deploy.mjs CLI 전용(번들 밖). 배포 절차
```

방향: `features/splash → lib/preloader ← lib/ota`, `lib/deep-link → stores/auth-store`, `app → features`. lib는 features를 모른다(팝업 연결은 splash 화면이 콜백으로 주입).

## 시퀀스

```
네이티브 launch ─ splash 표시(app.config expo-splash-screen: bg #208AEF)
 ├─ [+native-intent] OS 링크로 켜졌으면: initial → markSplashReopened() + '/splash'  /  웜 → 매처 경로
 ├─ _layout 모듈 스코프 ① (동기)
 └─ RootLayout 렌더 ─ Stack(initialRouteName='splash') · GlobalOverlays(Popup·Toast) · DeepLinkRunner(콜드 URL 캡처 → 큐 'cold' 홀드)
      └─ /splash ─ useSplashInitializer
           ├─ prefetchOnSplash(queryClient)          fire-and-forget
           └─ runPreloader — 실행 스테이지만 순차, 각각 try/catch, 절대 throw 안 함
                hydrate        onHydrate 주입 시 (8s 상한)
                forced-update  정책 fetch(8s) → 현재<min? → SplashScreen.hide() → 팝업(비해제) → 스토어 → never-resolve ⛔
                ota            어댑터 enabled & !__DEV__ → check(requestTimeout 8s, 실패=조용히 스킵) → 팝업 → download(인디케이터) → 1.5s 플로어 → setTimeout(reload,0) ⟳
                permissions-check  requestAllPermissions(KR lib/preloader/permissions — 알림). 상한 없음(OS 다이얼로그 대기)
              finally: isInitialized · SplashScreen.hide()   ← 어떤 실패에도 앱 진입
           └─ isInitialized → 큐 있음? notifySplashClosed(핸들러가 splash를 replace)  /  없음 → replace('/(tabs)') → 100ms → notifySplashClosed
      dispatcher: cold 릴리스 → matchRoute → handler.navigate (기본: cold=replace, 그 외=navigate)
```

## 확정 결정

- **OTA = hot-updater 0.36(자체 서버), expo-updates 아님.** KR/JP 모두 hot-updater + 자체 서버(자체 OTA 서버: 자체 서버). `updateStrategy: 'fingerprint'`, 채널 `production` 고정 — 환경 분리는 서버 URL·버킷. 프리로더는 엔진을 모르고 `OtaAdapter`만 본다 → 엔진 교체는 `lib/ota/` 파일 하나.
- **`Env.urls.ota`가 비면 OTA 전부 비활성.** init도 체크도 안 한다("주입=활성화"). 템플릿엔 서버가 없으니 기본이 비활성이 맞다.
- **사용자 동의형 OTA.** 조용히 다음 부팅에 적용(expo-updates 기본)이 아니라 팝업 → 지금 업데이트 → reload. 두 앱 UX. 체크 실패는 failures에도 안 남기고 조용히 넘어간다 — OTA는 부팅을 막을 이유가 없다.
- **프리로더는 KR 그대로.** 2026-09-03 사용자 지시("가볍지 않은 시스템, 그대로 이식")로 템플릿 재구현(선언형 스테이지·스테이지 타임아웃·OtaAdapter·콜백 주입 옵션)을 걷어내고 KR 파일을 옮겼다. 허용 변경은 Env 접근·auth `status`·강제 업데이트 API 스텁·popup.confirm 팝업·OTA URL 빈 값 가드뿐. KR 과 같은 알려진 성질: 스테이지 타임아웃 없음(서버 행이면 splash 대기), hideAsync 는 initializer finally + 두 팝업 유틸이 호출.
- **인트로 게이트.** KR 은 프리로더 뒤 인트로 영상이 끝나야 탭으로 갔다. 템플릿은 그 자리를 `features/splash/intro-gate.ts` 게이트로 두고 기본 구현은 최소 노출 1초(영상 없으면 새로고침 때 splash 가 깜빡이고 사라짐). 영상은 이 훅만 교체(`TODO(앱)`, 이식 가이드 주석). OTA 진행 중엔 KR 처럼 게이트 스킵.
- **강제 업데이트 블록 = never-resolving promise + sticky 팝업.** '업데이트' 탭 → 스토어 → 프리로더가 영원히 안 끝남 → 앱 진입 불가. 팝업은 닫혀도 다시 띄운다(스토어에서 돌아와도 막힘).
- **권한은 프리로더 안에서만.** KR 의 `lib/preloader/permissions/`(react-native-permissions, `requestAllPermissions`) 그대로 — 권한을 늘리면 `AppPermission`·`DEFAULT_PERMISSION_CONFIG` 에 추가. 참조 앱의 ATT는 `useEffect`에서 알림 권한과 경합했다 — 금지.
- **콜드 딥링크는 `/splash`로 우회한다.** `+native-intent`가 리다이렉트만 하고(enqueue는 RN Linking 단독 — 중복 방지), 큐가 splash 종료까지 `'cold'`를 홀드. 프리로더(강제 업데이트·OTA)를 건너뛰는 진입이 없어진다.
- **딥링크 = KR 메커니즘 + 빈 정책.** 캡처·큐·중복 제거·콜드 홀드·라우트 테이블·기본 이동에 더해 KR 의 **안전 탈출 계보**를 그대로 둔다(2026-09-04 사용자 지시): 게이트 인프라(`gates/index.ts` `runGates`·`GATE_MAP`), `RouteHandler.gates`/`safeFallbackExpoPath`, `peekSafeFallback()`(미등록 콜드 링크 → 홈, 게이트 라우트 → 안전 화면 먼저), `enqueueOrFallback()`(매처 미등록 URL → 안전 경로/외부 브라우저). 구체 게이트(auth·verified·marketing·pushPermission)와 pending-intent 재생, 스택 합성은 **프로젝트 정책**이라 `GATE_MAP`·라우트 `navigate` 안에서 채운다(`TODO(앱)`). 템플릿 추가 가드 하나: cold 진입의 navigate 가 throw 하면 `SAFE_FALLBACK_PATH` 로 replace(KR 은 이 경우 splash 잔류).
- **팝업은 toast와 같은 구조.** `stores/overlay` 상태 + `popup.confirm(): Promise` + `GlobalOverlays` 마운트. overlay-kit·moti 금지(decisions). 프리로더처럼 React 밖 async에서 `await`할 수 있어야 해서 Promise 표면이 필수.
- **JS splash 라우트에 영상 없음.** 네이티브 splash와 같은 배경색 + 로고. 참조 앱의 인트로 영상(expo-video)은 브랜드 자산이라 제외.
- **expo-splash-screen 플러그인의 `image`는 루트에.** SDK 57 플러그인은 iOS에 image가 없으면 storyboard의 imageView를 지우고 배경색을 `systemBackgroundColor`(흰색)로 남긴다 — `android` 밑에만 두면 iOS 네이티브 splash가 흰색이 되어 JS splash(#208AEF)와 이음새가 깨진다(2026-09-03 storyboard 확인). 로고·색은 두 플랫폼 공통으로 루트에 둔다.

## 어트리뷰션 SDK — 선택, 뗐다 붙였다 (2026-09-07, KR 대조 확인)

참조 앱 KR 은 Airbridge(디퍼드 딥링크 지원)를 쓰고 JP 는 쓰지 않는다. 템플릿은 **둘 다 가능해야**
하므로 SDK import 를 `lib/deep-link/attribution.ts` 한 파일에 가둔다. 비어 있으면 미사용이고
런타임 비용이 0이며, 붙이고 뗄 때 템플릿 소유 파일(`hooks/use-deep-link.ts`)을 건드리지 않는다.
푸시의 `pushTokenSyncAdapter` 와 같은 관용구다.

**손대는 곳 4개** (KR = Airbridge 기준, 실제 소스 대조):

| #   | 어디                                             | 무엇                                                                                                                                           |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `app.config.ts` plugins                          | SDK 의 config plugin. **JS init 호출은 없다** — KR 의 `index.js`·`_layout` 어디에도 `Airbridge.init()` 이 없고 플러그인이 네이티브를 다 잡는다 |
| 2   | `constants/deep-link.ts` `DEEP_LINK_HTTPS_HOSTS` | SDK 링크 도메인 추가. iOS `associatedDomains` · Android `intentFilters` · `+native-intent` 인식이 이 한 곳에서 파생된다                        |
| 3   | `lib/deep-link/attribution.ts`                   | `subscribeDeepLink` 하나. KR 은 `Airbridge.setOnDeeplinkReceived(url => …enqueueExternalSdkUrl(url))` 한 줄이다                                |
| 4   | (선택) 이벤트 taxonomy                           | KR `lib/airbridge/{events,identity,product}.ts`. 구매·장바구니 등 도메인 이벤트 — 앱 범위, 템플릿 밖                                           |

**중복 제거와의 커플링 — 모르고 바꾸면 조용히 깨진다.** `HANDLED_TTL_MS`(2초)는 같은 링크가
여러 source 로 들어오는 창이다. KR 이 그 값으로 문제없이 도는 이유는 SDK 가 링크를 OS Linking 으로
재전파하지 않기 때문이다(`iosPropagateDeeplink: false`) — 전달 경로가 하나뿐이라 중복 자체가 없다.
전파를 켜면 OS Linking 과 SDK 콜백이 각각 전달하고, SDK 는 자기 서버를 왕복하므로 간격이 2초를
넘겨 같은 화면으로 두 번 이동할 수 있다. 켜야 한다면 TTL 을 함께 올린다. KR 소스에는 이 이유가
적혀 있지 않다.

**템플릿이 KR 보다 나은 지점**: KR 은 링크 호스트 목록을 `+native-intent.tsx` 와 `app.config.ts`
두 곳에 중복으로 갖고 있다. 템플릿은 `DEEP_LINK_HTTPS_HOSTS` 하나에서 셋 다 파생한다.

## 프리로더 이식 검증 (2026-09-07, KR diff)

문서가 "core/types/permissions 는 바이트 동일"이라 주장해 실제로 diff 했다. **바이트는 다르지만
로직은 동일하다** — KR 파일이 자기 prettier 설정(양쪽 동일: printWidth 100, trailingComma es5)으로
포맷되지 않은 상태였다. KR `core.ts` 를 템플릿 prettier 로 포맷하면 **완전 일치**한다(증명).

| 파일                                                       | 포맷 정규화 후 차이                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| `core.ts` · `types.ts` · `index.ts` · `permissions/*`(5개) | **0줄**                                                      |
| `hydrate.ts`                                               | auth `isAuthenticated` → `status`(템플릿 스토어 모양) + 주석 |
| `ota.ts`                                                   | `Env.EXPO_PUBLIC_HOT_UPDATER_BASE_URL` → `Env.urls.ota`      |
| `forced-update.ts`                                         | Env 경로 · `api/app/controller` → `api/app/requests`         |
| `splash-initializer.tsx`                                   | 주석 1줄(KR 은 인트로 영상 언급)                             |

모든 차이가 선언된 허용 변경(Env 경로 · auth status · api/app 스텁 · 주석) 안이고 **로직 드리프트는
0**이다. 스테이지 순서·실패 격리·`hideAsync` 소유권은 KR 과 같다.

## 거부된 대안 (다시 제안하지 말 것)

- expo-updates → 앱 인프라가 hot-updater 자체 서버. EAS Update 종속·채널 모델 불일치.
- `HotUpdater.wrap()` HOC → 부팅 파이프라인 밖에서 앱을 게이트한다. 우리 실패 정책·팝업·splash 소유권과 맞지 않음. 두 앱도 `init()` + 수동 체크.
- 프리로더 스테이지 전체 타임아웃 → 사용자 선택 구간까지 끊어 강제 업데이트 블록을 무력화. 입력 없는 구간만.
- `+native-intent`에서 enqueue → RN Linking과 중복 적재. 리다이렉트만.
- 딥링크 **구체 게이트 구현**(auth 게이트·pending-intent·AuthDeferredRunner) 이식 → 참조 앱 정책. 게이트 인프라와 safeFallback 메커니즘은 안전 탈출 경로라 남긴다(2026-09-04 — 한 번 제거했다가 복원).
- 딥링크 라우트 테이블을 constants에 → navigate 함수가 lib/hooks를 역참조. `lib/deep-link/matcher.ts`에 둔다.
- zx로 배포 스크립트 → devDep 하나 늘리기 싫어 `node:child_process`.
- `dotenv`로 CLI에 .env 로드 → Node 내장 `process.loadEnvFile`(20.12+)로 충분. `scripts/load-build-env.cjs`.

## 프로젝트가 채우는 곳 (`grep -rn "TODO(앱)" src env-candidates.ts hot-updater.config.ts`)

| 어디                                                  | 무엇                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `env-candidates.ts` `urls.ota`                        | OTA 서버 주소(3환경). 채우면 활성                                                                                                                                                                                                                                                                    |
| `hot-updater.config.ts`                               | S3 버킷·리전. 시크릿은 `.env` `APP_BUILD_ONLY_AWS_*`                                                                                                                                                                                                                                                 |
| `api/app/requests.ts`                                 | 강제 업데이트 정책 API(`getAppForceUpdate` — KR 응답 형태 `payload.minVersion`·`storeUrl`). 스텁 null이면 스킵                                                                                                                                                                                       |
| `features/splash/splash-screen.tsx` · `intro-gate.ts` | 배경색(app.config splash와 동일하게)·로고 · 인트로 영상 게이트                                                                                                                                                                                                                                       |
| `lib/api/prefetch.ts`                                 | 첫 화면 쿼리 목록(KR 위치)                                                                                                                                                                                                                                                                           |
| `utils/show-*-popup.ts`                               | 팝업 카피                                                                                                                                                                                                                                                                                            |
| `constants/deep-link.ts`                              | 유니버설 링크 https 호스트 — 채우면 파서·매처와 함께 `app.config.ts` 가 `associatedDomains`·`intentFilters` 도 파생한다                                                                                                                                                                              |
| `constants/deep-link.ts`                              | 스펙 테이블 — `STATIC_DEEP_LINK_ROUTES`(appPaths/webPaths/to/reset/gates/whenAuthenticated) · `DYNAMIC_ROUTES_SPEC`(appPattern/queryDriven/toExpoPath/gates/safeFallbackExpoPath/navigate 오버라이드) · `EXTERNAL_WEB_PAGE_PATTERNS`(+`/external-web` 라우트) · `AUTH_LOGIN_PATH`/`AUTH_ROUTE_GROUP` |
| `lib/deep-link/parser.ts`                             | `WEB_TO_APP_PATH_ALIASES` · `WEB_QUERY_TO_PATH_RULES` (웹↔앱 URL 이 다를 때)                                                                                                                                                                                                                         |
| `lib/deep-link/attribution.ts`                        | 어트리뷰션 SDK(선택). 비우면 미사용 — 위 "어트리뷰션 SDK" 절의 4접점                                                                                                                                                                                                                                 |
| `lib/deep-link/gates/`                                | `GATE_MAP` 확장(KR: verified·marketing·pushPermission), `types.ts` `GateName` union                                                                                                                                                                                                                  |
| `app.config.ts`                                       | 손댈 것 없음 — 유니버설 링크 네이티브 설정은 `constants/deep-link.ts` 에서 파생                                                                                                                                                                                                                      |

## 운영

- OTA 배포: `pnpm ota:deploy:ios:production` (= prebuild 클린 → `hot-updater fingerprint create` → `deploy -c production -m "<msg> [<sha>]"`). preview는 `:preview`. `EXPO_PUBLIC_APP_ENV` 미지정 배포는 스크립트가 거부.
- 네이티브가 바뀌면(의존성·플러그인) fingerprint가 바뀌어 기존 OTA 대상에서 자동 제외된다 — 스토어 배포가 필요하다는 신호.
- 서버: `자체 OTA 서버`(자체 서버, `createHotUpdater` from `@hot-updater/server`) 참고. 그 README의 운영 체크리스트(HTTPS·볼륨·CLI 인증·백업)는 미완이니 그대로 믿지 말 것.

## 검증 상태 (2026-09-03)

- 스크래치 하네스(커밋 안 함, 레시피 template-completion A4): preloader 13/13(격리·타임아웃·스킵/카운트·강제 업데이트 사다리·OTA 어댑터 흐름) · deep-link 10/10(parser·matcher·콜드 홀드·즉시 처리·dedup·reopen·sources·native-intent)
- `check-all`(tsc 6) · Expo Doctor 18/18(hot-updater 플러그인 포함) · frozen install · `hot-updater.config.ts` tsx 로드 스모크
- **미검증**: RN 0.86 네이티브 빌드에서 hot-updater 컴파일(`pnpm ios` 1회 필요) · 실제 OTA 서버 배포/롤백(서버 없음) · 시뮬 콜드 딥링크(`xcrun simctl openurl booted <scheme>://menu-4/42`). 푸시 탭 딥링크는 docs/push.md 검증 상태 참고
