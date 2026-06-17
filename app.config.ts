import "tsx/cjs";

import type { ConfigContext, ExpoConfig } from "expo/config";

import Env from "./env";

/**
 * 빌드 전용 시크릿 읽기 헬퍼.
 * - prebuild/CI(STRICT_ENV_VALIDATION=1)에서는 누락 시 throw
 * - 평소 개발 중에는 warn 후 빈 값으로 진행
 *
 * 사용 예 (시크릿이 생기면 주석 해제):
 *   const SENTRY_AUTH_TOKEN = requireInStrict('APP_BUILD_ONLY_SENTRY_AUTH_TOKEN');
 */
const STRICT = process.env.STRICT_ENV_VALIDATION === "1";
export function requireInStrict(key: string): string {
  const value = process.env[key];
  if (!value) {
    const message = `[env.build] Missing build-time secret: ${key} (.env 확인)`;
    if (STRICT) throw new Error(message);
    console.warn(message);
  }
  return value ?? "";
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.identity.name,
  description: `${Env.identity.name} app`,
  slug: Env.identity.slug,
  version: Env.version.app,
  scheme: Env.identity.scheme,
  platforms: ["ios", "android"], // 웹 미지원
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  ios: {
    icon: "./assets/expo.icon",
    supportsTablet: true,
    bundleIdentifier: Env.identity.bundleId,
    buildNumber: Env.version.iosBuildNumber,
    infoPlist: {
      // 표준 암호화(HTTPS)만 사용한다는 선언 — 스토어 제출 시 설문 스킵.
      // 커스텀 암호화를 쓰게 되면 true 로 바꾸고 수출 규정 문서를 준비하세요.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    package: Env.identity.package,
    versionCode: Env.version.androidVersionCode,
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        android: {
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  // ── EAS 연결 시 (create-my-stack 또는 `eas init` 이 채움) ──
  // owner: 'your-expo-account',
  // extra: { eas: { projectId: 'xxxxxxxx-xxxx-...' } },
});
