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
  MMKV: jest.fn(mmkvInstance),
  createMMKV: jest.fn(mmkvInstance),
  useMMKVString: jest.fn(() => [undefined, jest.fn()]),
  useMMKVNumber: jest.fn(() => [undefined, jest.fn()]),
  useMMKVBoolean: jest.fn(() => [undefined, jest.fn()]),
  useMMKVObject: jest.fn(() => [undefined, jest.fn()]),
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'ko', languageTag: 'ko-KR', regionCode: 'KR' }]),
}));
