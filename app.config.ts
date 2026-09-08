import 'tsx/cjs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { APP_ENV, Env } from './env';
import { DEEP_LINK_HTTPS_HOSTS } from './src/constants/deep-link';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

// @types/node 를 devDep 으로 들이지 않으려고 require + 최소 단언으로 읽는다.
const { existsSync } = require('node:fs') as {
  existsSync: (path: string) => boolean;
};

// 빌드 전용 시크릿(.env 의 APP_BUILD_ONLY_*)은 이 파일에서만 읽는다 — docs/config.md.
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

// TODO(앱): 실제 시크릿으로 교체해 config plugin 옵션에 넘긴다. expo.extra 에는 넣지 않는다.
const EXAMPLE_BUILD_SECRET = requireInStrict('APP_BUILD_ONLY_EXAMPLE_SECRET');
if (STRICT) {
  console.log(`🔐 BUILD_SECRET APP_BUILD_ONLY_EXAMPLE_SECRET: ${mask(EXAMPLE_BUILD_SECRET)}`);
}

// 푸시 활성화 = plist + json 이 둘 다 있을 때. 없으면 RNFB 플러그인이 prebuild 에서
// throw 하므로 게이트가 필요하다 — docs/push.md.
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

// 비우면 Xcode 자동 서명. 로컬 `expo run:ios --device` 에만 쓴다.
const APPLE_TEAM_ID = process.env.APP_BUILD_ONLY_APPLE_TEAM_ID ?? '';

// 호스트 한 곳(constants/deep-link)에서 iOS·Android 를 같이 파생한다.
// non-production 의 `?mode=developer` 는 AASA 캐시를 건너뛴다 — docs/boot.md.
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

// dev/preview 아이콘에 환경·버전 배지 — 홈 화면에서 빌드를 구분한다.
const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: APP_ENV !== 'production',
  badges: [
    { text: APP_ENV, type: 'banner', color: 'white' },
    { text: Env.version.app, type: 'ribbon', color: 'white' },
  ],
};

const PUSH_PLUGINS: NonNullable<ExpoConfig['plugins']> = pushEnabled
  ? [
      ['@react-native-firebase/app', { ios: { disableSPM: true } }],
      '@react-native-firebase/messaging',
      'react-native-notify-kit',
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
      // 표준 암호화(HTTPS)만 쓴다는 선언 — 커스텀 암호화를 쓰면 true 로 바꾼다.
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
    // OTA: 채널은 production 고정, 환경 분리는 서버 URL·버킷 — docs/boot.md.
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
        // image 는 반드시 루트에 — android 밑에만 두면 iOS 네이티브 splash 가 흰색이 된다(docs/boot.md).
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    // static 은 무조건 — RNFB 는 푸시 off 에도 컴파일된다(docs/push.md).
    [
      'expo-build-properties',
      { ios: { useFrameworks: 'static' }, android: { enableProguardInReleaseBuilds: true } },
    ],
    ['react-native-permissions', { iosPermissions: ['Notifications'] }],
    // 자체 플러그인 — android: 폴더블·release 서명 / ios: Podfile DisableSPM.
    ['./plugins/with-plugin', { pushEnabled, displayName: Env.identity.displayName }],
    ['app-icon-badge', appIconBadgeConfig],
    // 어트리뷰션 SDK(선택) 자리 — 붙이면 한 줄 추가. 접점은 lib/deep-link/attribution.ts.
    ...PUSH_PLUGINS,
  ],
  experiments: {
    typedRoutes: true,
  },
  // EAS 는 기본 미연결 — `eas init` 또는 아래 두 줄로 붙인다(docs/config.md "EAS").
  // owner: 'your-expo-account',
  // extra: { eas: { projectId: 'xxxxxxxx-xxxx-...' } },
});
