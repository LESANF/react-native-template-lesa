# 푸시 알림 설계 노트 (FCM · notify-kit · 탭→딥링크 · 토큰 동기화 · 권한)

> 푸시가 **왜 이렇게 짜였는지** 기록한다. 되돌리거나 "개선"하기 전에 여기부터 읽어라.
> 근거: 참조 앱 KR · 참조 앱 JP의 실운영 코드(2026-09-03 파일 단위 분석 — 결함 D1~D19)와 SDK 57 호환성 검수. 두 앱의 스택을 따르되, 아카이브된 notifee는 Invertase가 권고한 포크로 바꿨다.

## 두 계층

```
① headless 진입   index.js → lib/push/background.ts — React·라우터·스토어 없이 실행된다(Android 백그라운드 메시지, 알림 탭)
                   setBackgroundMessageHandler(FCM data-only → notifee.handleFcmMessage) · notifee.onBackgroundEvent(PRESS → 큐) · 채널 보장
                   React·navigation·화면은 import 금지. 스토어(MMKV 동기)는 KR 처럼 dispatcher→matcher→gates 체인으로 이어져도 된다. 단 hydrateAuth 는 _layout 모듈 스코프라 headless 에선 안 돈다(게이트 check 는 signedOut 으로 읽힘)
② React 안         hooks/use-deep-link(DeepLinkRunner) → lib/push/taps.ts — 콜드 캡처 + 포그라운드 리스너
                   features/splash → lib/preloader/permissions(프리로더 permissions 스테이지, KR) · lib/push/token-sync(프리로더 완료 후)
```

`package.json` `main`은 `expo-router/entry`가 아니라 루트 `index.js`다(Expo 공식 "custom entry"). 사이드이펙트를 먼저 import하고 `expo-router/entry`를 **마지막**에 import한다.

## 파일 지도 & 의존 방향

```
constants/push.ts        PUSH_CHANNEL_ID('high-priority' — firebase.json과 같은 값) · PUSH_DEEP_LINK_DATA_KEYS
lib/push/
  core.ts                isPushConfigured(getApps().length>0) · getPushMessaging · ensurePushChannel(메모이즈: 채널 + setFcmConfig) · enqueuePushTap(url → dispatcher). URL 추출은 lib/deep-link/extractors(KR)
  background.ts          headless 모듈 스코프 — 위 ①
  taps.ts                capturePushColdStart(RNFB + notifee getInitialNotification → 'cold') · subscribePush(onMessage·onNotificationOpenedApp·onForegroundEvent)
  token-sync.ts          PushTokenSyncAdapter(TODO 스텁) · startPushTokenSync(싱글턴) · unregisterPushToken
index.js · firebase.json · firebase/README.md   entry · RNFB 네이티브 설정 · Firebase 파일 두는 곳
app.config.ts            파일 존재 → RNFB·notify-kit 플러그인·googleServicesFile·aps 주입. static + $RNFirebaseDisableSPM은 무조건
```

방향: `lib/push → lib/deep-link(dispatcher·extractors) · stores/auth-store · constants`, `features/splash·home → lib/push`, `hooks/use-deep-link → lib/push/taps`. `background.ts` 는 React·화면만 금지.

## 누가 표시하고 누가 탭을 전달하나 (FCM Mode)

| 플랫폼  | 앱 상태        | 표시                                                                                    | 탭 이벤트 → `enqueuePushTap`                                                                                                                                   |
| ------- | -------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android | fg / bg / 종료 | 서버가 data-only로 보내므로 FCM SDK는 안 그린다 → `handleFcmMessage`(notifee)           | notifee: fg `onForegroundEvent`, bg `onBackgroundEvent`, 종료 `getInitialNotification`                                                                         |
| iOS     | fg             | `onMessage` → `handleFcmMessage`(notifee 배너)                                          | notifee `onForegroundEvent`                                                                                                                                    |
| iOS     | bg / 종료      | OS가 `aps.alert`를 그린다(NSE가 `notifee_options`로 재구성). `handleFcmMessage`는 no-op | RNFB `onNotificationOpenedApp` / `getInitialNotification` **그리고** notifee PRESS도 발화 → 같은 URL이라 dispatcher dedup(키 = path?query, 2s)이 하나로 합친다 |
| 둘 다   | splash 열림    | —                                                                                       | dispatcher가 bg/fg-tap을 `'cold'`로 강제해 splash 종료까지 홀드                                                                                                |

누락되는 상태는 없다. 두 소스가 겹치는 상태는 iOS bg/종료 하나이고, 그래서 dispatcher가 `markHandled`를 navigate **앞**에서 찍는다.

## 확정 결정

- **RNFB 26.3.3 정확 고정.** sub-package가 app을 exact peer-pin한다. RN 0.86에서 CI 검증된 유일한 라인(RNFB 자체 test-expo: expo 57.0.14 + RN 0.86.2). 모듈러 API만 있다(`messaging()` 네임스페이스 삭제).
- **표시는 notify-kit(notifee 포크) FCM Mode.** `@notifee/react-native`는 2026-04 아카이브, README에서 notify-kit 이관 권고. FCM Mode는 Android를 data-only로 보내 **중복 알림을 구조적으로 없애고**, iOS를 alert + `mutable-content`로 보내 **silent push 유실(실기 30~60%)을 피한다**. 참조 앱의 수동 `displayNotification` 패턴은 두 문제를 안고 있어 포그라운드 표시를 꺼둔 상태였다(D5).
- **`fallbackBehavior: 'display'`.** `notifee_options`가 없는 구 페이로드(title/body만)도 표시된다 → 서버 이행 전에도 동작.
- **주입=활성화 = Firebase 파일 존재.** `firebase/GoogleService-Info.<env>.plist`와 `firebase/google-services.<env>.json`이 **둘 다** 있어야 RNFB·notify-kit 플러그인과 `googleServicesFile`·`aps-environment`·`UIBackgroundModes`가 들어간다. RNFB 플러그인은 파일이 없으면 prebuild에서 throw하므로 플러그인 자체를 게이트한다. 플러그인이 없으면 AppDelegate에 `FirebaseApp.configure()`도 안 들어가 부팅이 안전하고, RNFB 네이티브는 로그만 남긴다. 런타임 스위치는 `getApps().length > 0`. 한쪽만 있으면 `STRICT_ENV_VALIDATION=1`에서 throw.
- **iOS 링크는 static CocoaPods, 무조건.** RNFB는 deps라 푸시 off 빌드에도 컴파일된다. RNFB 26 기본은 SPM이고 SPM은 `use_frameworks! :linkage => :static`과 hard-fail이므로 `expo-build-properties` static과 Podfile `$RNFirebaseDisableSPM = true`를 게이트 밖에 둔다 → 빌드 flavor 하나, SPM 미지수 0, KR/JP와 같은 링크 방식. 푸시 on이면 RNFB 플러그인의 `disableSPM`이 같은 플래그를 쓴다.
- **NSE는 notify-kit 플러그인이 생성한다.** `ios.notificationServiceExtension: true` → `NotifyKitNSE` 타깃(RNNotifeeCore만 의존, 첨부 이미지 다운로드). 참조 앱의 `@bacons/apple-targets` NSE(153줄 Swift, 이미지 첨부 전용)와 같은 역할. apple-targets는 SDK 57 미검증(`@expo/prebuild-config ~55` 의존, pnpm hoisting 이슈)이라 뺐다.
- **권한은 react-native-permissions 하나.** RNFB 25부터 messaging 권한 API deprecated. 참조 앱은 같은 일을 세 API로 했다(D10) — 템플릿은 KR 의 `lib/preloader/permissions/`(requestAllPermissions) 한 경로만 쓴다.
- **토큰 동기화는 프리로더 완료 후 시작.** 참조 앱은 RootLayout effect에서 즉시 등록하다가 권한 프롬프트와 경합해 iOS 토큰이 null로 끝났다(D1). `startPushTokenSync()`는 앱 수명 싱글턴(멱등, cleanup 없음 — splash는 unmount된다). iOS `getToken`이 APNs 전이라 throw하면 로그만, `onTokenRefresh`가 회복한다.
- **로그아웃 시 재등록 방지.** 참조 앱은 `deleteToken` → 새 토큰 발급 → `onTokenRefresh`가 아직 signedIn인 상태를 보고 재등록했다(D2). 템플릿은 `deleteToken`을 signedIn→signedOut **전이 뒤** 구독에서 호출하고, refresh 핸들러는 `status === 'signedIn'`일 때만 등록한다 — 플래그 없이 순서로 해결. 서버 매핑 해제(`unregisterPushToken`)는 인증 헤더가 필요하니 `signOut()` **전**에 앱이 await한다.
- **채널은 상수 한 곳 + entry에서 보장.** `PUSH_CHANNEL_ID`와 `firebase.json`이 같은 값. `ensurePushChannel()`은 promise 메모이즈로 entry 모듈 스코프·백그라운드 핸들러·`onMessage` 진입 시 await → 첫 푸시가 fallback 채널로 떨어지지 않는다(D3).
- **탭 소스는 RNFB와 notifee 둘 다 배선.** 위 표대로 플랫폼·상태별로 누가 발화하는지 다르다. 겹침은 dispatcher가 처리한다(D4·D5·D6).

## 거부된 대안 (다시 제안하지 말 것)

- expo-notifications → Android 포그라운드 서비스·리치 스타일·풀스크린 인텐트 없음, FCM Mode 같은 중복/유실 대책 없음. 두 앱도 notifee.
- `@notifee/react-native` 9.1.8 유지 → 아카이브(2026-04), 2024-12 마지막 릴리즈, SDK 54+ Android 빌드 이슈(#1284), Expo 플러그인 없음.
- RNFB 23.x 유지 → RN 0.86 검증 없음. 템플릿은 레거시가 없어 26으로 바로.
- `@bacons/apple-targets`로 NSE → 위 결정 참고. notify-kit 플러그인이 대체.
- `useFrameworks: 'static'`을 푸시 on일 때만 → 푸시 off 빌드에서 RNFB가 SPM 기본으로 떨어져 static과 충돌(또는 SPM 경로 미검증). 무조건이 맞다.
- `react-native.config.js`로 푸시 off 시 RNFB 언링크 → JS import 시 네이티브 부재로 throw 위험, 게이트 두 겹. `getApps()`로 충분.
- 토큰 동기화용 프리로더 스테이지 추가 → 프리로더 완료 후 호출 한 줄로 같은 순서 보장.
- `suspended` 플래그로 D2 해결 → deleteToken을 전이 뒤 구독에서 호출하면 플래그가 필요 없다.
- `_layout` effect에 `setupMessaging()` → 소스 배선은 이미 `use-deep-link`에 모여 있다(RN Linking과 같은 자리). `_layout`은 무변경.
- Firebase 파일 gitignore → 참조 앱은 커밋(Firebase 공개 설정, 시크릿 아님). 원하면 `firebase/README.md`의 방법.

## 서버 페이로드 계약 (TODO(앱) — 서버 담당에게)

- 발송은 `react-native-notify-kit/server`의 `buildNotifyKitPayload({ token, notification: { title, body, data, android, ios } })`로 만든 메시지를 Firebase Admin `send()`에 넘긴다. Android는 data-only, iOS는 alert + `mutable-content`가 자동으로 나온다.
- 딥링크는 `notification.data`에 `deep_link`(또는 `deepLink`·`link`)로 넣는다 — 값은 `<scheme>://menu-4/42` 같은 앱 스킴 또는 유니버설 링크. 클라이언트는 `PUSH_DEEP_LINK_DATA_KEYS` 순서로 첫 non-empty string을 쓴다.
- Android 채널은 `notifee_options.android.channelId`가 없으면 `high-priority`(`setFcmConfig.defaultChannelId`). 채널을 늘리면 `constants/push.ts`와 앱 부팅 시 생성도 함께.
- 예약 키(`notifee_options`·`notifee_data`, FCM denylist `from`·`gcm.*` 등)는 서버 SDK가 거부/제거한다.

## 프로젝트가 채우는 곳 (`grep -rn "TODO(앱)" src app.config.ts firebase`)

| 어디                                     | 무엇                                                                                                                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `firebase/`                              | `GoogleService-Info.<env>.plist` · `google-services.<env>.json` (3환경). Firebase 콘솔에 APNs 키 업로드                                                                                        |
| `lib/push/token-sync.ts`                 | `pushTokenSyncAdapter.register/unregister` — 서버 endpoint·바디(KR `{deviceId,deviceType,pushToken}` / JP `{platform,token}`처럼 앱마다 다름)                                                  |
| 로그아웃 흐름                            | `await unregisterPushToken()` **후** `signOut()`                                                                                                                                               |
| `lib/push/taps.ts`                       | 배지 리셋 정책(예: 포그라운드 복귀 시 `notifee.setBadgeCount(0)`)                                                                                                                              |
| `lib/preloader/permissions/` 결과 소비처 | 알림 거부(`shouldGuide`)일 때 설정 이동 UX(참조 앱은 팝업 → `openSettings`)                                                                                                                    |
| `lib/push/core.ts` `setFcmConfig`        | `ios.suppressForegroundBanner` 등 표시 정책, 채널 추가                                                                                                                                         |
| `app.config.ts` notify-kit 플러그인      | Android small icon(`android.icons`), 포그라운드 서비스 타입                                                                                                                                    |
| NSE 서명                                 | 기본(EAS 미연결)은 **수동 프로비저닝** — `<bundleId>.NotifyKitNSE` 프로필을 따로 만든다(타깃이 하나 늘어난다). EAS 를 붙이면 `extra.eas.build.experimental.ios.appExtensions` 에 자동 등록된다 |

## 운영

- 푸시 on/off는 파일 존재로 갈리므로 **빌드하는 머신·CI(EAS 를 붙였다면 EAS)에도 같은 파일이 있어야** 프로덕션 빌드에 푸시가 들어간다. 없으면 조용히 off로 빌드된다 → `STRICT_ENV_VALIDATION=1`에서는 한쪽만 있을 때 throw, 둘 다 없으면 `[push] disabled` 로그.
- 네이티브가 바뀌므로(RNFB·notify-kit·NSE) hot-updater fingerprint가 바뀐다 — 스토어 배포 필요.
- 시뮬레이터는 APNs를 못 받는다. Firebase 없이도 홈 "Push" 버튼(로컬 알림 → 탭 → menu-4/42)과 `xcrun simctl push <UDID> <bundleId> payload.apns`로 표시·탭·딥링크는 확인할 수 있다. FCM 수신·NSE 이미지는 실기 + Firebase 프로젝트.

## 검증 상태 (2026-09-03)

- 스크래치 하네스(커밋 안 함, 레시피 template-completion A4): 구성 모드 15/15 · 미구성 모드 11/11 — extractPushUrl 사다리 · ensurePushChannel 메모이즈 · headless bg 핸들러 게이트 · onBackgroundEvent PRESS→cold 홀드 · dispatcher 두 소스 dedup(markHandled 선행) · cold 캡처 once · subscribePush 등록/해제 · 권한 사다리 · token-sync(멱등 start·signedIn 등록·refresh guard·D1 getToken throw 회복·D2 signOut 후 refresh 무시·unregister)
- `check-all`·`expo config --type prebuild` 3회(파일 0 / 더미 2 / STRICT+1 → throw)·`expo export -p ios`(custom entry 번들)·frozen install·expo-doctor 18/18·`expo install --check` 통과
- **실빌드(푸시 off)**: `prebuild --clean` 에서 RNFB 26.3.3 pod 이 `$RNFirebaseDisableSPM` 을 인식해 CocoaPods 경로로, static framework 로 RN 0.86.3 빌드 성공(iOS 26.4 시뮬). SDK 57 기본 `usePrecompiledModules` 와의 조합도 문제 없음 — 폴백 불필요
- dev client 부팅: 커스텀 엔트리(`index.js`)로 번들 로드 · headless `[push] disabled — Firebase 미구성(getApps()=0)` 출력 · 크래시 없음. 그 뒤 화면이 흰색으로 남는 문제는 `main`을 `expo-router/entry`로 되돌려도 동일해 **푸시와 무관**(C2 항목, template-completion C2 `[!]`). 시뮬 QA는 사용자 몫.
- **미검증**: 실기 FCM 수신·APNs·NSE 이미지(Firebase 프로젝트 필요 — 앱 몫) · 서버 SDK 페이로드 · 푸시 on 빌드(사용자가 dev 설정 파일을 제공할 때만)
