module.exports = {
  // 들여쓰기 스페이스 수 (2칸)
  tabWidth: 2,
  // 싱글 쿼트 사용 ('hello' 대신 "hello")
  singleQuote: true,
  // 한 줄 최대 길이
  printWidth: 100,
  // 객체 중괄호 안에 공백 ({ foo: bar } vs {foo: bar})
  bracketSpacing: true,
  // JSX 닫는 괄호를 같은 줄에 배치 (<div> vs <div\n>)
  bracketSameLine: true,
  // 탭 대신 스페이스 사용
  useTabs: false,
  // 세미콜론 사용
  semi: true,
  // 화살표 함수 파라미터 괄호 (x => x vs (x) => x)
  arrowParens: 'avoid',
  // 파일 상단에 @format 주석이 있는 파일만 포맷 (false = 모든 파일 포맷)
  requirePragma: false,
  // 마크다운 텍스트 줄바꿈 방식 (preserve = 원본 유지)
  proseWrap: 'preserve',
  // HTML 공백 처리 민감도 (ignore = 공백 무시)
  htmlWhitespaceSensitivity: 'ignore',
  // 줄바꿈 문자 (auto = 기존 파일 형식 유지, lf = Unix/Mac, crlf = Windows)
  endOfLine: 'auto',
  // 마지막 쉼표 (none = 사용 안함, es5 = 객체/배열만, all = 함수 파라미터 포함)
  trailingComma: 'es5',
  // Tailwind CSS 클래스 자동 정렬 플러그인
  plugins: ['prettier-plugin-tailwindcss'],
  // Tailwind v4 는 설정이 CSS(@theme)에 있다 — 플러그인이 토큰을 읽을 진입점을 명시해야
  // 커스텀 유틸(text-display 등)을 알고 정렬한다. v3 의 tailwindConfig 대체 옵션.
  tailwindStylesheet: './src/global.css',
};
