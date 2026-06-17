// 디자인 시스템 진입점 — 이 프로젝트에서 유일하게 허용되는 barrel.
// 규칙: 외부 라이브러리 re-export 금지, 무거운 컴포넌트(차트 등)는 직접 import.
// 컴포넌트 승격(Rule of Three) 시 여기에 한 줄 추가하세요.
//   export { Button } from './button';
export { ErrorFallback } from './error-fallback';
export { Placeholder } from './placeholder';
export { Text } from './text';
