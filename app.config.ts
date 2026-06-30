import "tsx/cjs";

import type { ConfigContext, ExpoConfig } from "expo/config";

import { Env } from "./env";

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
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
        "react-native-edge-to-edge",
        {
          android: {
            parentTheme: "Default",
            enforceNavigationBarContrast: false,
          },
        },
      ],
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
  };
};
