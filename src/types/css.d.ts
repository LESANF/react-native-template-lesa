declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Expo 는 `*.css` 를 `expo/types` 에서 선언하지만 그 진입점인 `expo-env.d.ts` 가
// gitignore 대상이라 clean clone 에서는 없다 — clone 직후 tsc 가 깨지지 않게 여기서 선언한다.
declare module '*.css';
