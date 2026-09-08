import { CodeGenerator, withPodfile } from 'expo/config-plugins';

import type { ConfigPlugin } from 'expo/config-plugins';
import type { PluginOptions } from './with-plugin';

/**
 * iOS 보정 — 푸시 off 빌드의 Podfile 에 `$RNFirebaseDisableSPM` 주입. 사유는 `docs/push.md`.
 * `withAppDelegate` 를 덧붙일 땐 앵커를 못 찾으면 throw 시킨다 — 조용히 빠지면 안 된다.
 */
const DISABLE_SPM_TAG = 'template-firebase-disable-spm';

const withIosPlugin: ConfigPlugin<PluginOptions> = (config, { pushEnabled }) => {
  if (pushEnabled) return config;

  return withPodfile(config, podfileConfig => {
    podfileConfig.modResults.contents = CodeGenerator.mergeContents({
      tag: DISABLE_SPM_TAG,
      src: podfileConfig.modResults.contents,
      newSrc: '$RNFirebaseDisableSPM = true',
      // RNFB 플러그인과 같은 앵커 — target 블록보다 먼저 정의돼야 firebase_spm.rb 가 본다.
      anchor: /prepare_react_native_project!/,
      offset: 1,
      comment: '#',
    }).contents;
    return podfileConfig;
  });
};

export default withIosPlugin;
