/** 네이티브 모듈 목. 모듈이 없다는 오류가 나면 여기에 더한다 — `docs/config.md` "테스트". */
import { jest } from '@jest/globals';

jest.mock('react-native-worklets', () => ({ __esModule: true, default: {} }));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, ScrollView: View, createAnimatedComponent: (c: unknown) => c },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn((fn: () => unknown) => fn()),
    withTiming: jest.fn(v => v),
    withSpring: jest.fn(v => v),
    withDelay: jest.fn((_, v) => v),
    withRepeat: jest.fn(v => v),
    withSequence: jest.fn((...v: unknown[]) => v[0]),
    cancelAnimation: jest.fn(),
    // 템플릿이 실제로 쓰는 것들 — 빠뜨리면 화면 테스트에서 undefined 로 터진다.
    useDerivedValue: jest.fn((fn: () => unknown) => ({ value: fn() })),
    useAnimatedReaction: jest.fn(),
    runOnJS: jest.fn((fn: unknown) => fn),
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
    Easing: { linear: jest.fn(), ease: jest.fn(), bezier: jest.fn(), inOut: jest.fn(fn => fn) },
    Layout: {},
  };
});

// v4 는 `remove` 다(`delete` 아님) — 이름이 어긋나면 storage 를 쓰는 테스트가 전부 터진다.
const mmkvInstance = () => ({
  set: jest.fn(),
  getString: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(() => false),
  clearAll: jest.fn(),
  getAllKeys: jest.fn(() => []),
});

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(mmkvInstance),
  useMMKVString: jest.fn(() => [undefined, jest.fn()]),
  useMMKVNumber: jest.fn(() => [undefined, jest.fn()]),
  useMMKVBoolean: jest.fn(() => [undefined, jest.fn()]),
  useMMKVObject: jest.fn(() => [undefined, jest.fn()]),
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'ko', languageTag: 'ko-KR', regionCode: 'KR' }]),
}));

/**
 * 푸시. 이 목이 없으면 `lib/push/*` 를 import 하는 순간 "Native module
 * NativeRNFBTurboApp is not registered" 로 죽어 **푸시 경로를 테스트할 수 없다.**
 * `getApps()` 가 빈 배열이라 기본 상태는 푸시 미구성이다 — 켠 상태를 테스트하려면
 * 그 테스트에서 `getApps` 를 다시 목한다.
 */
jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  deleteToken: jest.fn(async () => undefined),
  getInitialNotification: jest.fn(async () => null),
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'test-fcm-token'),
  onMessage: jest.fn(() => () => undefined),
  onNotificationOpenedApp: jest.fn(() => () => undefined),
  onTokenRefresh: jest.fn(() => () => undefined),
  setBackgroundMessageHandler: jest.fn(),
}));

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  AndroidImportance: { HIGH: 4 },
  AndroidStyle: { BIGPICTURE: 1 },
  EventType: { DISMISSED: 0, PRESS: 1 },
  default: {
    createChannel: jest.fn(async () => 'channel'),
    displayNotification: jest.fn(async () => 'notification'),
    getInitialNotification: jest.fn(async () => null),
    onBackgroundEvent: jest.fn(),
    onForegroundEvent: jest.fn(() => () => undefined),
    setBadgeCount: jest.fn(async () => undefined),
  },
}));
