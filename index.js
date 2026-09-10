// 커스텀 엔트리. 순서가 계약이다 — 사이드이펙트 import 가 먼저, 'expo-router/entry' 가 마지막.
// 푸시 headless 는 모듈 스코프에 이미 등록돼 있어야 발화한다(docs/push.md).
import './src/lib/push/background';

import 'expo-router/entry';

// 첫 요청 전에 XHR/fetch 를 패치해야 해서 entry 앞이다. require 를 if 안에 둬야
// production 번들에서 모듈째 빠진다.
if (__DEV__ || process.env.EXPO_PUBLIC_APP_ENV !== 'production') {
  const { startNetworkLogging } = require('react-native-network-logger');
  startNetworkLogging({
    ignoredHosts: ['symbolicate', 'logs', 'metro'],
    maxRequests: 500,
  });
}
