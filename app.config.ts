import 'tsx/cjs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { APP_ENV, Env } from './env';
import { DEEP_LINK_HTTPS_HOSTS } from './src/constants/deep-link';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

// app.config 는 Node(tsx/cjs)에서만 실행된다. @types/node 를 devDep 으로 들이지 않으려고
// node:fs 를 require + 최소 타입 단언으로 읽는다(클라이언트 번들과 무관한 파일이다).
const { existsSync } = require('node:fs') as {
  existsSync: (path: string) => boolean;
};

/**
 * 빌드 전용 시크릿 읽기 — .env 의 APP_BUILD_ONLY_* 는 이 파일에서만 읽는다.
 * - prebuild/CI(STRICT_ENV_VALIDATION=1): 누락 시 throw
 * - 평소 개발: warn 후 빈 값으로 진행
 * EXPO_PUBLIC_ 접두사가 없고 Node(app.config)에서만 읽히므로 클라이언트 번들에 들어가지 않는다.
 */
const STRICT = process.env.STRICT_ENV_VALIDATION === '1';
function requireInStrict(key: string): string {
  const value = process.env[key];
  if (!value) {
    const message = `[env.build] Missing build-time secret: ${key} (.env 확인)`;
    if (STRICT) throw new Error(message);
    console.warn(message);
  }
  return value ?? '';
}
const mask = (value: string) => (value ? `****${value.slice(-4)}` : '(missing)');

// 예시 시크릿 — 읽기 경로를 보여주는 자리표시. TODO(앱): 실제 시크릿으로 교체하고 필요한
// config plugin 옵션에 전달한다(예: sentry authToken). expo.extra 에는 절대 넣지 않는다.
const EXAMPLE_BUILD_SECRET = requireInStrict('APP_BUILD_ONLY_EXAMPLE_SECRET');
if (STRICT) {
  console.log(`🔐 BUILD_SECRET APP_BUILD_ONLY_EXAMPLE_SECRET: ${mask(EXAMPLE_BUILD_SECRET)}`);
}

/**
 * ── 푸시(FCM) ─────────────────────────────────────────────────────────────
 * 활성화 스위치 = 파일 존재. 현재 환경의 plist + json 이 **둘 다** 있어야 RNFB/notify-kit
 * 플러그인과 googleServicesFile·aps-environment·UIBackgroundModes 가 주입된다.
 * (RNFB 의 config plugin 은 googleServicesFile 이 없으면 prebuild 에서 throw 하므로 게이트가 필요하다.)
 *
 * 반면 iOS 링크 설정 — `useFrameworks: 'static'` 과 `$RNFirebaseDisableSPM` — 은 **무조건**이다.
 * RNFB 는 dependencies 에 있어서 푸시가 꺼진 빌드에도 네이티브가 컴파일되고, RNFB 26 의 기본 SPM
 * 경로는 static 과 hard-fail 이다. 조건부로 두면 빌드 flavor 가 둘로 갈라져 SPM 미지수가 생긴다.
 */
const GOOGLE_SERVICES = {
  ios: `./firebase/GoogleService-Info.${APP_ENV}.plist`,
  android: `./firebase/google-services.${APP_ENV}.json`,
};
const presentGoogleServices = [GOOGLE_SERVICES.ios, GOOGLE_SERVICES.android].filter(existsSync);
const pushEnabled = presentGoogleServices.length === 2;

if (presentGoogleServices.length === 1) {
  const message =
    `[push] Firebase 설정 파일이 한쪽만 있습니다 (${presentGoogleServices[0]}) — ` +
    `iOS(${GOOGLE_SERVICES.ios}) 와 Android(${GOOGLE_SERVICES.android}) 를 모두 두거나 모두 지우세요.`;
  if (STRICT) throw new Error(message);
  console.warn(message);
} else if (!pushEnabled) {
  console.log(`[push] disabled — firebase/ 에 ${APP_ENV} 설정 파일이 없습니다 (docs/push.md)`);
}

/**
 * ── 참조 앱(KR/JP) app.config 에서 이식한 제네릭 설정 ──────────────────────
 * appleTeamId(로컬 디바이스 빌드 서명) · 유니버설 링크(constants/deep-link 의 호스트 한 곳에서 iOS/Android 동시 파생)
 * · app-icon-badge(dev/preview 아이콘에 환경·버전 배지) · ./plugins/with-plugin(android: 폴더블·release 서명 / ios: Podfile DisableSPM)
 * · proguard(release). 앱 전용(Airbridge·ChannelTalk·fbsdk·ATT·Noto 폰트·결제 스킴·Analytics 메타데이터)은 제외.
 */
// 로컬 `expo run:ios --device` 서명용. 시크릿은 아니지만 계정 종속이라 .env 에 둔다. 없으면 Xcode 자동 서명에 맡긴다.
const APPLE_TEAM_ID = process.env.APP_BUILD_ONLY_APPLE_TEAM_ID ?? '';

// 유니버설 링크: `src/constants/deep-link.ts` 의 DEEP_LINK_HTTPS_HOSTS 를 채우면 파서·매처와 함께 네이티브 설정도 켜진다.
// non-production 은 `?mode=developer` 로 AASA 캐시 없이 즉시 검증(Apple 개발자 모드).
const UNIVERSAL_LINK_HOSTS = DEEP_LINK_HTTPS_HOSTS;
const associatedDomains = UNIVERSAL_LINK_HOSTS.map(
  host => `applinks:${host}${APP_ENV === 'production' ? '' : '?mode=developer'}`
);
const universalLinkIntentFilters = UNIVERSAL_LINK_HOSTS.map(host => ({
  action: 'VIEW',
  autoVerify: true,
  data: [{ scheme: 'https', host }],
  category: ['BROWSABLE', 'DEFAULT'],
}));

// dev/preview 빌드의 앱 아이콘에 환경·버전 배지 — 홈 화면에서 빌드를 구분한다(prebuild 시 jimp 로 합성).
const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: APP_ENV !== 'production',
  badges: [
    { text: APP_ENV, type: 'banner', color: 'white' },
    { text: Env.version.app, type: 'ribbon', color: 'white' },
  ],
};

// notify-kit 플러그인이 iOS NSE 타깃(NotifyKitNSE)을 prebuild 에서 생성한다 — 푸시가 켜졌을 때만.
const PUSH_PLUGINS: NonNullable<ExpoConfig['plugins']> = pushEnabled
  ? [
      ['@react-native-firebase/app', { ios: { disableSPM: true } }],
      '@react-native-firebase/messaging',
      ['react-native-notify-kit', { ios: { notificationServiceExtension: true } }],
    ]
  : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.identity.name,
  description: `${Env.identity.name} app`,
  slug: Env.identity.slug,
  version: Env.version.app,
  scheme: Env.identity.scheme,
  platforms: ['ios', 'android'], // 웹 미지원
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    icon: './assets/expo.icon',
    supportsTablet: true,
    bundleIdentifier: Env.identity.bundleId,
    buildNumber: Env.version.iosBuildNumber,
    ...(APPLE_TEAM_ID ? { appleTeamId: APPLE_TEAM_ID } : {}),
    ...(associatedDomains.length > 0 ? { associatedDomains } : {}),
    infoPlist: {
      // 표준 암호화(HTTPS)만 사용한다는 선언 — 스토어 제출 시 설문 스킵.
      // 커스텀 암호화를 쓰게 되면 true 로 바꾸고 수출 규정 문서를 준비하세요.
      ITSAppUsesNonExemptEncryption: false,
      // 홈 화면 이름만 갈아끼운다 — `name`(ASCII)은 Xcode 프로젝트·스킴·PRODUCT_NAME 이 쓴다.
      ...(Env.identity.displayName ? { CFBundleDisplayName: Env.identity.displayName } : {}),
      // data-only/silent 푸시를 백그라운드에서 받아 notify-kit 이 그리려면 필요하다.
      ...(pushEnabled ? { UIBackgroundModes: ['remote-notification'] } : {}),
    },
    ...(pushEnabled
      ? {
          googleServicesFile: GOOGLE_SERVICES.ios,
          // development 인증서로 서명한 빌드가 production APNs 를 쓰면 토큰이 무효가 된다.
          entitlements: {
            'aps-environment': APP_ENV === 'production' ? 'production' : 'development',
          },
        }
      : {}),
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    package: Env.identity.package,
    versionCode: Env.version.androidVersionCode,
    predictiveBackGestureEnabled: false,
    // Android 13+ 런타임 권한. 푸시가 꺼져 있어도 로컬 알림(notify-kit)에 필요하다.
    permissions: ['android.permission.POST_NOTIFICATIONS'],
    ...(universalLinkIntentFilters.length > 0 ? { intentFilters: universalLinkIntentFilters } : {}),
    ...(pushEnabled ? { googleServicesFile: GOOGLE_SERVICES.android } : {}),
  },
  plugins: [
    'expo-router',
    // OTA(hot-updater): 채널은 production 고정, 환경 분리는 서버 URL·버킷. 프리빌드 시 fingerprint를 네이티브에 기록한다.
    ['@hot-updater/react-native', { channel: 'production' }],
    'expo-font',
    'expo-image',
    'expo-web-browser',
    [
      'react-native-edge-to-edge',
      {
        android: {
          parentTheme: 'Default',
          enforceNavigationBarContrast: false,
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        // image 는 루트에 둔다 — iOS 는 image 가 없으면 storyboard 배경색을 systemBackground(흰색)로 남겨
        // JS splash(#208AEF)와 이음새가 깨진다(SDK 57 플러그인 동작, 2026-09-03 확인). 두 플랫폼 공통.
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    // RNFB 는 푸시 off 에도 컴파일된다 → static framework 는 무조건(빌드 flavor 하나).
    // android.enableProguardInReleaseBuilds: release 번들 축소·난독화(KR/JP 동일).
    [
      'expo-build-properties',
      { ios: { useFrameworks: 'static' }, android: { enableProguardInReleaseBuilds: true } },
    ],
    ['react-native-permissions', { iosPermissions: ['Notifications'] }],
    // 프로젝트 자체 플러그인(plugins/with-plugin → android · ios). 푸시 off 면 iOS 쪽이 Podfile 에 DisableSPM 을 넣는다.
    ['./plugins/with-plugin', { pushEnabled, displayName: Env.identity.displayName }],
    ['app-icon-badge', appIconBadgeConfig],
    // 어트리뷰션 SDK(선택)의 config plugin 자리 — 붙이면 여기 한 줄, 떼면 지운다.
    // JS init 호출은 없다(KR 확인: 플러그인이 네이티브를 다 잡는다). 딥링크 콜백 배선과
    // 링크 도메인 등록까지 4접점은 `lib/deep-link/attribution.ts` 주석 참고.
    ...PUSH_PLUGINS,
  ],
  // reactCompiler 는 두지 않는다 — 부팅 경로를 검증하는 동안 변수를 줄인다(참조 앱 KR/JP 도 typedRoutes 만 켠다).
  experiments: {
    typedRoutes: true,
  },
  // ── EAS 는 기본 미연결 — 템플릿은 `eas.json` 을 두지 않는다(참조 앱 KR/JP 도 안 쓴다).
  //    활성화는 파일 존재로 갈린다: `eas init` 을 돌리거나 아래 두 줄을 채우면 붙는다.
  //    그 전까지 빌드 경로는 로컬 프리빌드 + run:ios/android (docs/decisions.md "EAS").
  // owner: 'your-expo-account',
  // extra: { eas: { projectId: 'xxxxxxxx-xxxx-...' } },
});
