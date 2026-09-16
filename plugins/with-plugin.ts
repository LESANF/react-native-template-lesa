import withAndroidPlugin from './with-android-plugin';
import withIosPlugin from './with-ios-plugin';

import type { ConfigPlugin } from 'expo/config-plugins';

/**
 * 자체 config plugin 진입점 — app.config.ts 에는 이것 하나만 등록한다.
 * 옵션은 JSON 직렬화 가능한 값만 넘긴다.
 */
export type PluginOptions = {
  /** iOS Podfile 처리가 이 값으로 갈린다. */
  pushEnabled: boolean;
  /** 비면 Expo 기본(`name`)을 둔다. Android strings.xml 만 여기서 고친다. */
  displayName: string;
};

const withPlugin: ConfigPlugin<PluginOptions> = (config, options) => {
  config = withAndroidPlugin(config, options);
  config = withIosPlugin(config, options);
  return config;
};

export default withPlugin;
