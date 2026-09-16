import 'tsx/cjs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { APP_ENV, Env } from './env';
import { DEEP_LINK_HTTPS_HOSTS } from './src/constants/deep-link';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import { existsSync } from 'node:fs';

// `.env` 의 APP_BUILD_ONLY_* 는 이 파일에서만 읽는다 — docs/config.md.
const STRICT = process.env.STRICT_ENV_VALIDATION === '1';
// 값을 인자로 받는다 — `process.env[key]` 는 Metro 가 인라인하지 못하고 eslint 도 막는다.
function requireInStrict(key: string, value: string | undefined): string {
  if (!value) {
    const message = `[env.build] Missing build-time secret: ${key} (.env 확인)`;
    if (STRICT) throw new Error(message);
    console.warn(message);
  }
  return value ?? '';
}
const mask = (value: string) => (value ? `****${value.slice(-4)}` : '(missing)');

// TODO(앱): 실제 시크릿으로 교체. **expo.extra 에는 넣지 않는다.**
const EXAMPLE_BUILD_SECRET = requireInStrict(
  'APP_BUILD_ONLY_EXAMPLE_SECRET',
  process.env.APP_BUILD_ONLY_EXAMPLE_SECRET
);
if (STRICT) {
  console.log(`🔐 BUILD_SECRET APP_BUILD_ONLY_EXAMPLE_SECRET: ${mask(EXAMPLE_BUILD_SECRET)}`);
}

// 푸시 활성화 = plist + json 둘 다. 없이 켜면 RNFB 가 prebuild 에서 throw — docs/push.md.
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

// 비우면 Xcode 자동 서명.
const APPLE_TEAM_ID = process.env.APP_BUILD_ONLY_APPLE_TEAM_ID ?? '';

// 호스트 한 곳에서 iOS·Android 파생. `?mode=developer` 는 AASA 캐시를 건너뛴다.
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

// dev/preview 아이콘에 환경·버전 배지.
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
    icon: './assets/images/icon.png',
    supportsTablet: true,
    bundleIdentifier: Env.identity.bundleId,
    buildNumber: Env.version.iosBuildNumber,
    ...(APPLE_TEAM_ID ? { appleTeamId: APPLE_TEAM_ID } : {}),
    ...(associatedDomains.length > 0 ? { associatedDomains } : {}),
    infoPlist: {
      // 표준 암호화만 쓴다는 선언. 커스텀 암호화를 쓰면 true.
      ITSAppUsesNonExemptEncryption: false,
      // 홈 화면 이름만. `name`(ASCII)은 Xcode 프로젝트·스킴이 쓴다.
      ...(Env.identity.displayName ? { CFBundleDisplayName: Env.identity.displayName } : {}),
      // data-only 푸시를 백그라운드에서 받으려면 필요.
      ...(pushEnabled ? { UIBackgroundModes: ['remote-notification'] } : {}),
    },
    ...(pushEnabled
      ? {
          googleServicesFile: GOOGLE_SERVICES.ios,
          // development 서명 빌드가 production APNs 를 쓰면 토큰이 무효가 된다.
          entitlements: {
            'aps-environment': APP_ENV === 'production' ? 'production' : 'development',
          },
        }
      : {}),
  },
  android: {
    adaptiveIcon: {
      // 런처가 108dp 중 중앙 72dp 만 남기므로 여백 있는 파일을 쓴다 — 풀블리드는 잘린다.
      backgroundColor: '#FFFBEF',
      foregroundImage: './assets/images/adaptive-icon.png',
    },
    package: Env.identity.package,
    versionCode: Env.version.androidVersionCode,
    predictiveBackGestureEnabled: false,
    // Android 13+ 런타임 권한. 푸시 off 에도 로컬 알림에 필요.
    permissions: ['android.permission.POST_NOTIFICATIONS'],
    ...(universalLinkIntentFilters.length > 0 ? { intentFilters: universalLinkIntentFilters } : {}),
    ...(pushEnabled ? { googleServicesFile: GOOGLE_SERVICES.android } : {}),
  },
  plugins: [
    'expo-router',
    // 채널은 production 고정. 환경 분리는 서버 URL·버킷.
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
    // static 은 무조건 — RNFB 는 푸시 off 에도 컴파일된다.
    [
      'expo-build-properties',
      {
        // iOS 27 SDK 는 UIScene 을 요구한다 — 끄면 빌드는 되고 실행에서 죽는다.
        // SDK 58 부터는 기본이라 이 줄을 지운다(켜둔 채로 두면 경고만 나온다).
        ios: { useFrameworks: 'static', enableSceneSupport: true },
        android: { enableProguardInReleaseBuilds: true },
      },
    ],
    ['react-native-permissions', { iosPermissions: ['Notifications'] }],
    // 자체 플러그인 — 폴더블 · release 서명 · Podfile DisableSPM.
    ['./plugins/with-plugin', { pushEnabled, displayName: Env.identity.displayName }],
    ['app-icon-badge', appIconBadgeConfig],
    // 어트리뷰션 SDK(선택) 자리. 접점은 lib/deep-link/attribution.ts.
    ...PUSH_PLUGINS,
  ],
  experiments: {
    typedRoutes: true,
  },
  // EAS 미연결. `eas init` 또는 아래 두 줄로 붙인다.
  // owner: 'your-expo-account',
  // extra: { eas: { projectId: 'xxxxxxxx-xxxx-...' } },
});
