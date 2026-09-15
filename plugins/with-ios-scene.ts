import { CodeGenerator, withAppDelegate, withInfoPlist } from 'expo/config-plugins';

import type { ConfigPlugin } from 'expo/config-plugins';

/**
 * iOS 27 SDK 는 **UIScene 생명주기를 요구한다** — 없으면 빌드는 되고 실행에서
 * `UIScene life cycle is required for apps built with this SDK` 로 죽는다.
 * SDK 57 템플릿은 AppDelegate 가 window 를 만들기 때문에 그대로는 뜨지 않는다.
 *
 * 여기서 하는 일은 셋이다 — Info.plist 에 scene manifest, AppDelegate 에서 window 생성 제거,
 * `SceneDelegate` 선언. 런타임 클래스(`ExpoAppSceneDelegate`)는 `patches/expo@57.0.22.patch`
 * 가 넣는다(upstream expo/expo#50026, SDK 57 타깃, 미머지).
 *
 * **제거 조건**: #50026 이 57.0.x 에 들어오면 이 플러그인과 패치를 같이 지운다.
 * 상세는 `docs/config.md` "iOS 27 UIScene".
 */

const SCENE_DELEGATE_TAG = 'template-scene-delegate';
const STARTUP_REPLACED = '    // React Native 는 SceneDelegate 가 scene 과 함께 시작한다.';

/** AppDelegate 원문 → scene 생명주기. 앵커가 어긋나면 throw 한다. */
export function adoptSceneLifecycle(contents: string): string {
  const replacements = [
    [
      'class AppDelegate: ExpoAppDelegate {',
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    ],
    ['  var window: UIWindow?', '  public var window: UIWindow?'],
    [
      '  var reactNativeFactory: RCTReactNativeFactory?',
      '  public var reactNativeFactory: RCTReactNativeFactory?',
    ],
  ] as const;

  for (const [before, after] of replacements) {
    if (contents.includes(after)) continue;
    if (contents.split(before).length !== 2) {
      throw new Error(`[with-ios-scene] AppDelegate 앵커를 하나만 찾아야 한다: ${before}`);
    }
    contents = contents.replace(before, after);
  }

  // window 생성 + startReactNative 블록을 통째로 지운다. 남기면 scene 이 만든 window 와 둘이 된다.
  if (!contents.includes(STARTUP_REPLACED)) {
    const startup =
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;
    if (!startup.test(contents)) {
      throw new Error(
        '[with-ios-scene] AppDelegate 의 window/startReactNative 블록을 찾지 못했다 — ' +
          'SDK 템플릿이 바뀌었다. plugins/with-ios-scene.ts 의 정규식을 고친다.'
      );
    }
    contents = contents.replace(startup, `${STARTUP_REPLACED}\n`);
  }

  return CodeGenerator.mergeContents({
    src: contents,
    tag: SCENE_DELEGATE_TAG,
    // ReactNativeDelegate 선언 바로 앞 — 파일 끝에 붙이면 @main 클래스 안에 들어간다.
    anchor: /^class ReactNativeDelegate: ExpoReactNativeFactoryDelegate \{/m,
    offset: 0,
    comment: '//',
    newSrc: '@objc(SceneDelegate)\nclass SceneDelegate: ExpoAppSceneDelegate {}\n',
  }).contents;
}

const withIosScene: ConfigPlugin = config => {
  config = withInfoPlist(config, plistConfig => {
    plistConfig.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return plistConfig;
  });

  return withAppDelegate(config, appDelegateConfig => {
    if (appDelegateConfig.modResults.language !== 'swift') {
      throw new Error('[with-ios-scene] Swift AppDelegate 를 기대한다');
    }
    appDelegateConfig.modResults.contents = adoptSceneLifecycle(
      appDelegateConfig.modResults.contents
    );
    return appDelegateConfig;
  });
};

export default withIosScene;
