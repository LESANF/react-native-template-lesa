/**
 * Conventional Commits. 타입은 feat·fix·docs·refactor·chore·test·perf·style·revert·build·ci.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 한국어 제목에 영문 고유명사(CodeGraph·README·SDK·CLI)를 쓰면 pascal-case 로 잡힌다.
    // 영어 문장을 전제한 규칙이라 끈다.
    'subject-case': [0],
    // 한국어는 같은 정보를 더 긴 문자열로 쓴다. 100 은 너무 빡빡하다.
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [0],
  },
};
