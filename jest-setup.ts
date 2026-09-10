/**
 * 네이티브 모듈 목. 테스트를 추가하다 "네이티브 모듈이 없다"는 오류가 나면 여기에 더한다.
 *
 * `jest` 를 import 하는 이유: @types/jest 30 은 `describe`·`it` 만 전역으로 선언하고
 * `jest` 객체는 `@jest/globals` 로 옮겼다. 런타임에는 전역이라 import 없이도 돌지만
 * `tsc` 가 "Cannot use namespace 'jest' as a value" 로 막는다.
 */
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

const mmkvInstance = () => ({
  set: jest.fn(),
  getString: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
  delete: jest.fn(),
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
