import {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withStringsXml,
} from 'expo/config-plugins';

import type { ConfigPlugin } from 'expo/config-plugins';
import type { PluginOptions } from './with-plugin';

/**
 * Android 네이티브 프로젝트 보정 — `./with-plugin` 이 조합한다. 참조 앱(KR/JP)에서 제네릭한 두 가지만 이식.
 *
 *  1) 폴더블 대응: MainActivity 의 configChanges 확장 + resizeableActivity — 접기/펴기 시 Activity 재생성 방지.
 *  2) release 서명: production 프리빌드에서만 `signingConfigs.release` 를 주입한다. 값은 **Gradle 실행 시점의
 *     환경 변수**(System.getenv)에서 읽으므로 .env 가 아니라 CI 시크릿/셸 export 로 넘긴다:
 *       ANDROID_UPLOAD_KEYSTORE_PATH (기본 `<repo>/upload.jks`) · ANDROID_UPLOAD_KEYSTORE_PASSWORD ·
 *       ANDROID_UPLOAD_KEY_ALIAS · ANDROID_UPLOAD_KEY_PASSWORD
 *     EAS 가 credentials 를 관리하면 이 블록은 쓰이지 않는다(EAS 는 자체 signingConfig 를 주입).
 *
 *  3) 표시명 분리: `displayName` 이 있으면 strings.xml 의 `app_name` 만 그 값으로 바꾼다.
 *     `name` 은 ASCII 를 유지해야 iOS 프로젝트·스킴이 멀쩡하다(env-candidates 주석 참고).
 *
 *  참조 앱의 결제 앱 query(`auwallet`)·Firebase Analytics 메타데이터는 앱 전용이라 넣지 않았다.
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

/** app/build.gradle 에 release signingConfig 를 멱등 주입한다. 내보내는 이유는 스크래치 테스트용. */
export function patchAppBuildGradle(contents: string): string {
  // 이미 주입돼 있으면 그대로 — prebuild 가 mod 를 다시 돌려도 결과가 같아야 한다.
  if (contents.includes('ANDROID_UPLOAD_KEYSTORE_PATH')) return contents;

  let next = contents.replace(
    SIGNING_CONFIGS_BLOCK_REGEX,
    (_match, open: string, body: string, close: string) => {
      const nextBody = RELEASE_BLOCK_HEADER_REGEX.test(body)
        ? body.replace(RELEASE_BLOCK_FULL_REGEX, RELEASE_SIGNING_CONFIG.trim())
        : `${body}${body.endsWith('\n') ? '' : '\n'}${RELEASE_SIGNING_CONFIG}\n`;
      return `${open}${nextBody}${close}`;
    }
  );

  // buildTypes.release 가 debug 키로 서명하게 돼 있으면 release 로 교체, 아예 없으면 한 줄 삽입.
  next = next.replace(BUILD_TYPES_RELEASE_DEBUG_REGEX, '$1signingConfig signingConfigs.release');
  if (!BUILD_TYPES_RELEASE_HAS_SIGNING_REGEX.test(next)) {
    next = next.replace(
      BUILD_TYPES_RELEASE_OPEN_REGEX,
      '$1            signingConfig signingConfigs.release\n'
    );
  }
  return next;
}

const withAndroidPlugin: ConfigPlugin<PluginOptions> = (config, { displayName }) => {
  // Expo 코어의 withName 이 `name` 으로 app_name 을 쓴 뒤에 이 mod 가 돌아 덮어쓴다
  // (mod 는 나중에 등록된 것이 나중에 실행된다 — prebuild 로 확인).
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
