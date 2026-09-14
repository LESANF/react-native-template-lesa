import {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withStringsXml,
} from 'expo/config-plugins';

import type { ConfigPlugin } from 'expo/config-plugins';
import type { PluginOptions } from './with-plugin';

/**
 * Android 보정 — 폴더블 · release 서명 · 표시명. 상세는 `docs/config.md`.
 * release 서명 값은 .env 가 아니라 **Gradle 실행 시점 env** `ANDROID_UPLOAD_*` 에서 읽는다.
 */

const SIGNING_CONFIGS_BLOCK_REGEX =
  /(\bsigningConfigs\s*\{)([\s\S]*?)(\n\s*\}\s*)(?=\n\s*buildTypes\s*\{)/;
const RELEASE_BLOCK_HEADER_REGEX = /^\s*release\s*\{/m;
const RELEASE_BLOCK_FULL_REGEX = /^\s*release\s*\{[\s\S]+?^\s*\}/m;
const BUILD_TYPES_RELEASE_DEBUG_REGEX =
  /(\bbuildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)\bsigningConfig\s+signingConfigs\.debug\b/;
const BUILD_TYPES_RELEASE_HAS_SIGNING_REGEX =
  /\bbuildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?\bsigningConfig\s+signingConfigs\./;
const BUILD_TYPES_RELEASE_OPEN_REGEX = /(\bbuildTypes\s*\{[\s\S]*?\brelease\s*\{\s*\n)/;

const RELEASE_SIGNING_CONFIG = `
        release {
            def keystorePath = System.getenv("ANDROID_UPLOAD_KEYSTORE_PATH") ?: "\${rootProject.projectDir}/../upload.jks"
            storeFile file(keystorePath)
            storePassword System.getenv("ANDROID_UPLOAD_KEYSTORE_PASSWORD") ?: ""
            keyAlias System.getenv("ANDROID_UPLOAD_KEY_ALIAS") ?: ""
            keyPassword System.getenv("ANDROID_UPLOAD_KEY_PASSWORD") ?: ""
        }`;

export class AndroidSigningPatchError extends Error {}

/**
 * 멱등 주입 — prebuild 가 mod 를 다시 돌려도 결과가 같아야 한다.
 *
 * 앵커가 안 맞으면 **throw 한다.** 그냥 두면 두 가지로 조용히 망가진다 —
 * signingConfigs 주입만 실패하면 Gradle 이 없는 `signingConfigs.release` 를 찾고,
 * buildTypes 치환만 실패하면 **debug 키로 서명된 릴리즈가 그대로 나간다.**
 * AGP 템플릿은 SDK 마다 바뀌므로 여기서 깨지는 것이 정상 동작이다.
 */
export function patchAppBuildGradle(contents: string): string {
  if (contents.includes('ANDROID_UPLOAD_KEYSTORE_PATH')) return contents;

  if (!SIGNING_CONFIGS_BLOCK_REGEX.test(contents)) {
    throw new AndroidSigningPatchError(
      'app/build.gradle 에서 signingConfigs 블록을 찾지 못했다 — AGP 템플릿이 바뀌었다. ' +
        'plugins/with-android-plugin.ts 의 SIGNING_CONFIGS_BLOCK_REGEX 를 고친다.'
    );
  }

  let next = contents.replace(
    SIGNING_CONFIGS_BLOCK_REGEX,
    (_match, open: string, body: string, close: string) => {
      const nextBody = RELEASE_BLOCK_HEADER_REGEX.test(body)
        ? body.replace(RELEASE_BLOCK_FULL_REGEX, RELEASE_SIGNING_CONFIG.trim())
        : `${body}${body.endsWith('\n') ? '' : '\n'}${RELEASE_SIGNING_CONFIG}\n`;
      return `${open}${nextBody}${close}`;
    }
  );

  // debug 키로 서명하게 돼 있으면 교체, 없으면 삽입.
  next = next.replace(BUILD_TYPES_RELEASE_DEBUG_REGEX, '$1signingConfig signingConfigs.release');
  if (!BUILD_TYPES_RELEASE_HAS_SIGNING_REGEX.test(next)) {
    next = next.replace(
      BUILD_TYPES_RELEASE_OPEN_REGEX,
      '$1            signingConfig signingConfigs.release\n'
    );
  }

  // 삽입까지 실패하면 release 가 debug 키를 쓴 채 남는다 — 그대로 스토어에 올라간다.
  if (
    !/\bbuildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?\bsigningConfig\s+signingConfigs\.release\b/.test(
      next
    )
  ) {
    throw new AndroidSigningPatchError(
      'buildTypes.release 에 signingConfigs.release 를 걸지 못했다 — 그대로 두면 ' +
        'debug 키로 서명된 릴리즈가 나간다. plugins/with-android-plugin.ts 의 ' +
        'BUILD_TYPES_* 정규식을 고친다.'
    );
  }

  return next;
}

const withAndroidPlugin: ConfigPlugin<PluginOptions> = (config, { displayName }) => {
  // 나중에 등록된 mod 가 나중에 실행되므로 Expo 코어의 withName 을 덮어쓴다.
  if (displayName) {
    config = withStringsXml(config, stringsConfig => {
      stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
        [{ _: displayName, $: { name: 'app_name' } }],
        stringsConfig.modResults
      );
      return stringsConfig;
    });
  }

  config = withAndroidManifest(config, manifestConfig => {
    const application = manifestConfig.modResults.manifest.application?.[0];
    const mainActivity = application?.activity?.find(a => a.$['android:name'] === '.MainActivity');
    if (mainActivity) {
      mainActivity.$['android:configChanges'] =
        'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|locale|layoutDirection|smallestScreenSize';
      mainActivity.$['android:resizeableActivity'] = 'true';
    }
    return manifestConfig;
  });

  config = withAppBuildGradle(config, gradleConfig => {
    if (process.env.EXPO_PUBLIC_APP_ENV !== 'production') return gradleConfig;
    gradleConfig.modResults.contents = patchAppBuildGradle(gradleConfig.modResults.contents);
    return gradleConfig;
  });

  return config;
};

export default withAndroidPlugin;
