# 푸시 알림 설계 노트 (FCM · notify-kit · 탭→딥링크 · 토큰 동기화 · 권한)

> 푸시가 **왜 이렇게 짜였는지** 기록한다. 되돌리거나 "개선"하기 전에 여기부터 읽어라.
> 근거: 참조 앱 두 개의 실운영 코드(2026-09-03 파일 단위 분석 — 결함 D1~D19)와 SDK 57 호환성 검수. 두 앱의 스택을 따르되, 아카이브된 notifee는 Invertase가 권고한 포크로 바꿨다.

## 두 계층

```
① headless 진입   index.js → lib/push/background.ts — React·라우터 없이 실행된다
                   setBackgroundMessageHandler(데이터 부수효과) · notifee.onBackgroundEvent(우리가 그린 알림의 PRESS → 큐) · 채널 보장
                   React·navigation·화면은 import 금지. 스토어(MMKV 동기)는 KR 처럼 dispatcher→matcher→gates 체인으로 이어져도 된다. 단 hydrateAuth 는 _layout 모듈 스코프라 headless 에선 안 돈다(게이트 check 는 signedOut 으로 읽힘)
② React 안         hooks/use-deep-link(DeepLinkRunner) → lib/push/taps.ts — 콜드 캡처 + 포그라운드 리스너
                   features/splash → lib/preloader/permissions(프리로더 permissions 스테이지, KR) · lib/push/token-sync(프리로더 완료 후)
```

`package.json` `main`은 `expo-router/entry`가 아니라 루트 `index.js`다(Expo 공식 "custom entry"). 사이드이펙트를 먼저 import하고 `expo-router/entry`를 **마지막**에 import한다.

## 파일 지도 & 의존 방향

```
constants/push.ts        PUSH_CHANNEL_ID(firebase.json과 같은 값) · SHOW_FOREGROUND_NOTIFICATION · PUSH_DEEP_LINK_DATA_KEYS
lib/push/
  core.ts                isPushConfigured(getApps().length>0) · getPushMessaging · ensurePushChannel(메모이즈: Android 채널) · enqueuePushTap(url → dispatcher). URL 추출은 lib/deep-link/extractors(KR)
  background.ts          headless 모듈 스코프 — 위 ①
  taps.ts                capturePushColdStart(RNFB + notifee getInitialNotification → 'cold') · subscribePush(onMessage→포그라운드 배너·onNotificationOpenedApp·onForegroundEvent)
  token-sync.ts          PushTokenSyncAdapter(TODO 스텁) · startPushTokenSync(싱글턴) · unregisterPushToken
index.js · firebase.json · firebase/README.md   entry · RNFB 네이티브 설정 · Firebase 파일 두는 곳
app.config.ts            파일 존재 → RNFB·notify-kit 플러그인·googleServicesFile·aps 주입. static + $RNFirebaseDisableSPM은 무조건
```

방향: `lib/push → lib/deep-link(dispatcher·extractors) · stores/auth-store · constants`, `features/splash·home → lib/push`, `hooks/use-deep-link → lib/push/taps`. `background.ts` 는 React·화면만 금지.

## 누가 표시하고 누가 탭을 전달하나

서버는 FCM `notification` 페이로드를 보낸다.

| 앱 상태     | 표시                                                                           | 탭 → `enqueuePushTap`                                                         |
| ----------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| foreground  | OS 는 안 그린다 → `SHOW_FOREGROUND_NOTIFICATION` 이면 우리가 notifee 로 그린다 | notifee `onForegroundEvent`                                                   |
| background  | **OS**                                                                         | RNFB `onNotificationOpenedApp`                                                |
| 종료        | **OS**                                                                         | RNFB `getInitialNotification`                                                 |
| 로컬 알림   | 우리(notifee)                                                                  | fg `onForegroundEvent` · bg/종료 `onBackgroundEvent`·`getInitialNotification` |
| splash 열림 | —                                                                              | dispatcher 가 `'cold'` 로 강제해 splash 종료까지 홀드                         |

표시 주체가 상태별로 갈려 **중복이 구조적으로 없다**. 두 SDK 를 모두 구독하는 이유는 원격(OS 가 그림)과
로컬(우리가 그림)의 탭 경로가 다르기 때문이다.

## 확정 결정

- **표시 정책 = 참조 앱 KR 그대로 (2026-09-07 사용자 지시).** 서버가 FCM `notification` 페이로드를
  보내고 **백그라운드·종료에서는 OS 가 그린다** — 우리 JS 는 표시에 개입하지 않으므로 중복이
  구조적으로 없다. 그 탭은 RNFB(`onNotificationOpenedApp` · `getInitialNotification`)로 온다.
  KR 이 프로덕션에서 검증한 경로다.
- **포그라운드는 앱 정책.** iOS·Android 모두 OS 가 표시하지 않고 `onMessage` 만 발화한다.
  그릴지는 `SHOW_FOREGROUND_NOTIFICATION`(constants/push) 하나로 갈린다 — 템플릿 기본 켬,
  KR 은 끄고 배지·목록 갱신만 한다. 표시하면 그 탭은 notifee 로 온다.
- **notify-kit FCM Mode 는 쓰지 않는다.** `setFcmConfig`·`handleFcmMessage` 미사용.
  FCM Mode 는 notify-kit 이 모든 상태의 표시를 가로채는 방식인데, KR 정책과 목적이 겹치면서
  실기 검증 이력이 없다. NSE 는 notify-kit 것이 아니라 KR 의 자체 타깃을 쓴다(아래 절).
- **라이브러리는 `react-native-notify-kit` 유지.** KR 의 `@notifee/react-native` 9.1.8 은
  아카이브(2026-04, 마지막 릴리스 2024-12) + SDK 54+ Android 빌드 이슈 + Expo 플러그인 부재다.
  notify-kit 은 같은 API 의 유지보수 fork 이고 FCM Mode 는 opt-in 이라 안 쓰면 그만이다.
  쓰는 것은 Android 채널 생성과 로컬/포그라운드 알림 표시뿐.
- **RNFB 26.3.3 exact** — sub-package 가 app 을 exact peer-pin 한다. RN 0.86 에서 CI 검증된
  유일한 라인. 모듈러 API 만 있다(`messaging()` 네임스페이스 삭제).
- **`onBackgroundEvent` 는 로컬·포그라운드 배너 탭 전용.** notify-kit 의 background 는
  "백그라운드 또는 종료" 둘 다를 뜻한다(iOS 는 탭 시점 `applicationState` 가 `Inactive`).
  OS 가 그린 FCM 알림의 탭은 여기 오지 않는다.
- **채널 상수는 한 곳** — `PUSH_CHANNEL_ID` 와 `firebase.json` 이 같은 값이어야 FCM SDK 가 직접
  그리는 알림도 같은 중요도로 떨어진다. 참조 앱은 3곳에 흩어져 있었다(D13).

## 토큰 동기화 (2026-09-07 KR 대조로 보강)

`startPushTokenSync()` 는 프리로더 권한 스테이지 뒤 splash 가 부른다. 상태기계는 auth 전이 구독 +
`onTokenRefresh` 두 입구를 갖는다.

KR 대조에서 **템플릿이 빠뜨린 KR 보호 두 개**를 찾아 이식했다(재현으로 확인):

| 보호                 | 없으면                                                                                                                                        | KR 근거                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `inFlight` 단일화    | auth 전이와 `onTokenRefresh` 가 같은 tick 에 겹치면 **같은 토큰을 두 번 POST** 한다. `lastRegistered` 는 await 후에 세팅되므로 창이 열려 있다 | `inFlightRegister` — "auth-transition 직후 onTokenRefresh 가 emit 되며 두 번 발화해 동일 페이로드가 동시에 POST 되는 race 차단용" |
| fetch 후 auth 재확인 | `getToken()` 대기 중 로그아웃하면 **로그아웃한 사용자의 토큰을 등록**한다                                                                     | "aborted (auth lost during fetch)"                                                                                                |

`try/catch/finally` 는 IIFE **안**에 둔다 — 밖에 두면 두 번째 호출자가 받은 promise 가 rejected 로
남아 unhandled rejection 이 된다(호출부는 전부 `void`).

확인된 나머지 주장:

- **D1**(권한 전 토큰) — `getToken` 실패를 삼키고 `onTokenRefresh` 로 회복. 유효.
- **D2**(로그아웃 재등록) — `onTokenRefresh` 의 status guard 로 막는다. 별도 플래그 불필요. 유효.
- **D3**(채널 지연) — 템플릿은 `index.js` 모듈 스코프에서 생성, KR 은 `_layout`(React 마운트). 개선 유효.
- **D13**(채널 문자열) — `PUSH_CHANNEL_ID` 와 `firebase.json` 이 같은 값('high-priority'). 확인.
- **extractors** — KR 과 로직 동일, 키 목록만 `constants/push` 상수로 뽑음.
- **로그아웃 순서** — KR 은 `unregisterDeviceToken()` → `postAuthLogout()` → `clearTokens()`.
  템플릿 TODO 가 같은 순서를 지시한다. 일치.

## 거부된 대안 (다시 제안하지 말 것)

- notify-kit **FCM Mode** → 모든 상태의 표시를 notify-kit 이 가로채는 방식. KR 정책(백그라운드/종료는 OS)과 목적이 겹치는데 실기 검증 이력이 없고 NSE 타깃·수동 프로비저닝이 따라온다. (2026-09-07 사용자 지시로 철회)
- expo-notifications → Android 포그라운드 서비스·리치 스타일·풀스크린 인텐트 없음. 두 앱도 notifee.
- `@notifee/react-native` 9.1.8 유지 → 아카이브(2026-04), 2024-12 마지막 릴리즈, SDK 54+ Android 빌드 이슈(#1284), Expo 플러그인 없음.
- RNFB 23.x 유지 → RN 0.86 검증 없음. 템플릿은 레거시가 없어 26으로 바로.
- `useFrameworks: 'static'`을 푸시 on일 때만 → 푸시 off 빌드에서 RNFB가 SPM 기본으로 떨어져 static과 충돌(또는 SPM 경로 미검증). 무조건이 맞다.
- `react-native.config.js`로 푸시 off 시 RNFB 언링크 → JS import 시 네이티브 부재로 throw 위험, 게이트 두 겹. `getApps()`로 충분.
- 토큰 동기화용 프리로더 스테이지 추가 → 프리로더 완료 후 호출 한 줄로 같은 순서 보장.
- `suspended` 플래그로 D2 해결 → deleteToken을 전이 뒤 구독에서 호출하면 플래그가 필요 없다.
- `_layout` effect에 `setupMessaging()` → 소스 배선은 이미 `use-deep-link`에 모여 있다(RN Linking과 같은 자리). `_layout`은 무변경.
- Firebase 파일 gitignore → 참조 앱은 커밋(Firebase 공개 설정, 시크릿 아님). 원하면 `firebase/README.md`의 방법.

## 서버 페이로드 계약 (TODO(앱) — 서버 담당에게)

- **표준 FCM `notification` 페이로드**를 보낸다(title·body). 백그라운드/종료에서 OS 가 이걸 그린다.
  notify-kit 서버 SDK(`buildNotifyKitPayload`)는 FCM Mode 전용이라 쓰지 않는다.
- 딥링크는 `data` 에 `deep_link`(또는 `deepLink`·`link`) — 값은 앱 스킴 또는 유니버설 링크.
  클라이언트는 `PUSH_DEEP_LINK_DATA_KEYS` 순서로 첫 non-empty 를 쓴다.
- Android 채널은 `firebase.json` 의 `messaging_android_notification_channel_id`(= `PUSH_CHANNEL_ID`).
- 이미지는 Android `notification.android.imageUrl`, iOS `data.fcm_options.image`.

## 프로젝트가 채우는 곳 (`grep -rn "TODO(앱)" src app.config.ts firebase`)

| 어디                                                                                                 | 무엇                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `firebase/` (코드 마커 없음 — 파일을 두는 디렉터리다)                                                | `GoogleService-Info.<env>.plist` · `google-services.<env>.json` (3환경). Firebase 콘솔에 APNs 키 업로드                                                    |
| `lib/push/token-sync.ts`                                                                             | `pushTokenSyncAdapter.register/unregister` — 서버 endpoint·바디(KR `{deviceId,deviceType,pushToken}` / JP `{platform,token}`처럼 앱마다 다름)              |
| 로그아웃 흐름                                                                                        | `await unregisterPushToken()` **후** `signOut()`                                                                                                           |
| `constants/push.ts`                                                                                  | `PUSH_CHANNEL_NAME`(Android 설정 화면 문구) · `PUSH_DEEP_LINK_DATA_KEYS`(서버 계약대로 줄인다) · `SHOW_FOREGROUND_NOTIFICATION`(포그라운드 배너 표시 여부) |
| `lib/push/background.ts`                                                                             | 헤드리스 부수효과 — 배지 저장·로컬 캐시 갱신 등. 표시는 OS 가 하므로 그리지 않는다. React·화면 import 금지                                                 |
| `lib/push/taps.ts`                                                                                   | 포그라운드 수신 시 알림 배지·목록 쿼리 invalidate(KR 은 배지/카테고리/목록 3개) · 배지 리셋 정책(`notifee.setBadgeCount(0)`)                               |
| `lib/preloader/permissions/` 결과 소비처 (코드 마커 없음 — 그 폴더는 KR verbatim 이라 손대지 않는다) | 알림 거부(`shouldGuide`)일 때 설정 이동 UX(참조 앱은 팝업 → `openSettings`)                                                                                |
| `app.config.ts` notify-kit 플러그인                                                                  | Android small icon(`android.icons`), 포그라운드 서비스 타입                                                                                                |
| `targets/notification-service/` (코드 마커 없음)                                                     | 채울 값 없음 — 번들·팀은 `app.config.ts` 에서 온다. 실기는 `<bundleId>.ImageNotification` 프로비저닝 프로필. 안 쓰면 폴더를 지운다                         |

## iOS NSE — 리치 푸시 이미지 (2026-09-17, KR verbatim)

iOS 는 백그라운드·종료 상태에서 이미지가 든 푸시를 앱이 아니라 **Notification Service Extension**
이 받아 첨부한다. 없으면 이미지 없는 알림만 뜬다. `targets/notification-service/` 가 그 타깃이고
`@bacons/apple-targets` 가 prebuild 때 Xcode 타깃으로 만든다.

- **켜는 조건** — 푸시가 켜진 상태(`firebase/` 파일)에서 `targets/notification-service/` 가 있으면
  `app.config.ts` 가 `@bacons/apple-targets` 를 플러그인에 넣는다. **빼려면 폴더를 지운다.**
  푸시가 꺼져 있으면 폴더가 있어도 안 붙는다.
- **읽는 키** — `fcm_options.image`(최상위·`data` 아래 둘 다) → `image`·`imageUrl`·`gcm.notification.image*`.
  포그라운드 경로(`lib/push/taps.ts`)와 같은 계약이다. 서버 페이로드 절 참고.
- **번들·서명** — `<bundleId>.ImageNotification`, 팀은 `ios.appleTeamId` 를 따라간다. 실기·배포는
  이 번들의 프로비저닝 프로필이 **따로** 필요하다(config.md "EAS 없이 운영").
- **패치가 필요하다** — `@bacons/apple-targets@4.0.6` 은 타깃이 이미 있는 상태의 prebuild(`--no-clean`)
  에서 죽는다. `patches/` 의 pnpm 패치가 고친다. 지우는 조건과 업스트림은 `patches/README.md`.
- `targets/**/generated.entitlements` 는 prebuild 산출물이라 gitignore 다.

## 운영

- 푸시 on/off는 파일 존재로 갈리므로 **빌드하는 머신·CI(EAS 를 붙였다면 EAS)에도 같은 파일이 있어야** 프로덕션 빌드에 푸시가 들어간다. 없으면 조용히 off로 빌드된다 → `STRICT_ENV_VALIDATION=1`에서는 한쪽만 있을 때 throw, 둘 다 없으면 `[push] disabled` 로그.
- 네이티브가 바뀌므로(RNFB·notify-kit·NSE) hot-updater fingerprint가 바뀐다 — 스토어 배포 필요.
- 시뮬레이터는 APNs를 못 받는다. Firebase 없이도 홈 "Push" 버튼(로컬 알림 → 탭 → menu-4/42)과 `xcrun simctl push <UDID> <bundleId> payload.apns`로 표시·탭·딥링크는 확인할 수 있다. FCM 수신·NSE 이미지는 실기 + Firebase 프로젝트.

## 검증 상태 (2026-09-03, 표시 정책 전환은 2026-09-07)

- 스크래치 하네스(커밋 안 함, 레시피 template-completion A4): 구성 모드 15/15 · 미구성 모드 11/11 — extractPushUrl 사다리 · ensurePushChannel 메모이즈 · headless bg 핸들러 게이트 · onBackgroundEvent PRESS→cold 홀드 · dispatcher 두 소스 dedup(markHandled 선행) · cold 캡처 once · subscribePush 등록/해제 · 권한 사다리 · token-sync(멱등 start·signedIn 등록·refresh guard·D1 getToken throw 회복·D2 signOut 후 refresh 무시·unregister)
- `check-all`·`expo config --type prebuild` 3회(파일 0 / 더미 2 / STRICT+1 → throw)·`expo export -p ios`(custom entry 번들)·frozen install·expo-doctor 18/18·`expo install --check` 통과
- **실빌드(푸시 off)**: `prebuild --clean` 에서 RNFB 26.3.3 pod 이 `$RNFirebaseDisableSPM` 을 인식해 CocoaPods 경로로, static framework 로 RN 0.86.3 빌드 성공(iOS 26.4 시뮬). SDK 57 기본 `usePrecompiledModules` 와의 조합도 문제 없음 — 폴백 불필요
- dev client 부팅: 커스텀 엔트리(`index.js`)로 번들 로드 · headless `[push] disabled — Firebase 미구성(getApps()=0)` 출력 · 크래시 없음. 그 뒤 화면이 흰색으로 남는 문제는 `main`을 `expo-router/entry`로 되돌려도 동일해 **푸시와 무관**(C2 항목, template-completion C2 `[!]`). 시뮬 QA는 사용자 몫.
- **확인(2026-09-17)**: 푸시 on 에서 NSE 타깃 생성 → `xcodebuild` 성공 → `.app/PlugIns/ImageNotification.appex`
  임베드(`com.apple.usernotifications.service`). prebuild 2회차(`--no-clean`)도 패치로 통과. 푸시 off 는 타깃 0.
- **미검증**: 실기 FCM 수신·APNs·NSE 이미지 표시(Firebase 프로젝트 + NSE 프로비저닝 필요 — 앱 몫) · 서버 SDK 페이로드 · 푸시 on 빌드(사용자가 dev 설정 파일을 제공할 때만)
