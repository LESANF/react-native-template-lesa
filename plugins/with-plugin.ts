import withAndroidPlugin from './with-android-plugin';

import type { ConfigPlugin } from 'expo/config-plugins';

/**
 * 자체 config plugin 진입점 — app.config.ts 에는 이것 하나만 등록한다.
 * 옵션은 JSON 직렬화 가능한 값만 넘긴다.
 */
export type PluginOptions = {
  /** 비면 Expo 기본(`name`)을 둔다. Android strings.xml 만 여기서 고친다. */
  displayName: string;
};

// iOS 보정은 없다 — RNFB 27 이 SPM 전용이 되면서 `$RNFirebaseDisableSPM` 주입이 사라졌다(docs/push.md).
const withPlugin: ConfigPlugin<PluginOptions> = (config, options) =>
  withAndroidPlugin(config, options);

export default withPlugin;
