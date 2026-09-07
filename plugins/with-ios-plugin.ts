import { CodeGenerator, withPodfile } from "expo/config-plugins";

import type { ConfigPlugin } from "expo/config-plugins";
import type { PluginOptions } from "./with-plugin";

/**
 * iOS 네이티브 프로젝트 보정 — `./with-plugin` 이 조합한다.
 *
 * 지금 하는 일: 푸시가 꺼진 빌드의 Podfile 에 `$RNFirebaseDisableSPM = true` 주입.
 *   RNFB 는 dependencies 라 푸시 off 에도 컴파일되는데, RNFB 26 기본 SPM 경로는 `use_frameworks! :linkage => :static`
 *   과 hard-fail 이다. 푸시 on 이면 RNFB 자체 플러그인(`ios.disableSPM`)이 같은 플래그를 쓰므로 여기서는 건너뛴다.
 *   `$RNFirebaseDisableSPM` 은 RNFB 문서의 공개 knob(firebase_spm.rb 가 읽는 Ruby 전역).
 *
 * 앱이 덧붙일 자리: AppDelegate.swift 문자열 패치(참조 앱 KR 은 Airbridge 푸시 추적을 여기서 했다 — SDK 57 은
 *   `internal import Expo` 라 앵커 정규식을 `/^(internal )?import Expo$/m` 로), Info.plist·entitlements 세부 조정.
 *   `withAppDelegate` 를 쓸 땐 앵커를 못 찾으면 throw 하도록 해서 조용히 빠지는 일을 막는다.
 */
const DISABLE_SPM_TAG = "template-firebase-disable-spm";

const withIosPlugin: ConfigPlugin<PluginOptions> = (config, { pushEnabled }) => {
  if (pushEnabled) return config;

  return withPodfile(config, (podfileConfig) => {
    podfileConfig.modResults.contents = CodeGenerator.mergeContents({
      tag: DISABLE_SPM_TAG,
      src: podfileConfig.modResults.contents,
      newSrc: "$RNFirebaseDisableSPM = true",
      // RNFB 플러그인과 같은 앵커 — target 블록보다 먼저 정의돼야 firebase_spm.rb 가 본다.
      anchor: /prepare_react_native_project!/,
      offset: 1,
      comment: "#",
    }).contents;
    return podfileConfig;
  });
};

export default withIosPlugin;
