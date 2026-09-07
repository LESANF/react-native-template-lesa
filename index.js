// Expo Router 커스텀 엔트리 — package.json "main"이 가리키는 파일.
// 푸시 headless 핸들러(setBackgroundMessageHandler · notifee.onBackgroundEvent)는 앱이 죽은 채로
// OS가 JS를 깨울 때 "모듈 스코프에 이미 등록돼 있어야" 발화한다. React 트리(_layout)는 그때 안 뜬다.
// 그래서 사이드이펙트 import가 먼저, 'expo-router/entry'가 마지막이다.
import './src/lib/push/background';

// 네트워크 로거 (개발/스테이징 빌드 전용) — XHR/fetch 를 패치하므로 앱 코드가 첫 요청을 보내기 전,
// 즉 'expo-router/entry' 앞에서 시작해야 초기 요청까지 잡힌다. require 는 if 안에 둬서
// production 번들에 모듈 자체가 들어가지 않게 한다(상수 폴딩 대상).
if (__DEV__ || process.env.EXPO_PUBLIC_APP_ENV !== 'production') {
  const { startNetworkLogging } = require('react-native-network-logger');
  startNetworkLogging({
    ignoredHosts: ['symbolicate', 'logs', 'metro'],
    maxRequests: 500,
  });
}

import 'expo-router/entry';
