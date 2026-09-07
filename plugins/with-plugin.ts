import withAndroidPlugin from './with-android-plugin';
import withIosPlugin from './with-ios-plugin';

import type { ConfigPlugin } from 'expo/config-plugins';

/**
 * 프로젝트 자체 config plugin 의 진입점 — app.config.ts 에는 이것 하나만 등록한다.
 * 플랫폼별 보정은 `with-android-plugin.ts` / `with-ios-plugin.ts` 로 나눈다(참조 앱 KR/JP 와 같은 구조).
 * 옵션은 app.config 가 계산한 값만 넘긴다(JSON 직렬화 가능해야 한다).
 */
export type PluginOptions = {
  /** firebase/ 설정 파일이 둘 다 있어 RNFB·notify-kit 플러그인이 켜졌는지. iOS Podfile 처리가 갈린다. */
  pushEnabled: boolean;
  /**
   * 홈 화면 표시명(`Env.identity.displayName`). 빈 문자열이면 Expo 기본(`name`)을 그대로 둔다.
   * iOS 는 app.config 가 `CFBundleDisplayName` 으로 직접 넣고, Android 만 여기서 strings.xml 을 고친다.
   */
  displayName: string;
};

const withPlugin: ConfigPlugin<PluginOptions> = (config, options) => {
  config = withAndroidPlugin(config, options);
  config = withIosPlugin(config, options);
  return config;
};

export default withPlugin;
