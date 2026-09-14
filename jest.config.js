/**
 * `**\/*.test.ts(x)` 를 잡는다. 템플릿이 들고 있는 것은 조용히 틀릴 수 있는 셋뿐이다 —
 * env 접기 · 딥링크 큐 · 토큰 갱신.
 * 참조 앱(KR) 설정에서 프로젝트 전용(CI 리포터·개별 라이브러리 매핑)을 걷어낸 형태다.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  // tsconfig 의 paths 와 같은 순서여야 한다 — `@/assets/*` 가 `@/*` 보다 먼저다.
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@env$': '<rootDir>/env.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // RN 생태계는 ESM 소스를 그대로 배포한다 — 여기 없는 패키지를 import 하면
  // "Unexpected token 'export'" 가 난다. 그때 이 목록에 추가한다.
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|react-native-svg|@tanstack/.*|react-native-reanimated|react-native-mmkv|react-native-worklets|zustand|tailwind-merge|tailwind-variants|uniwind|standard-navigation|expo-router))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!**/node_modules/**'],
  coverageDirectory: '<rootDir>/coverage/',
};
