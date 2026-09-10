/**
 * 스테이징된 파일만 손본다.
 * 이 레포는 prettier 가 eslint 에 붙어 있지 않다(`format` 스크립트가 따로 있다) — 그래서
 * ts/tsx 도 eslint --fix 와 prettier --write 를 둘 다 돌린다.
 */
const quote = files => files.map(file => `"${file}"`).join(' ');

module.exports = {
  '**/*.{js,jsx,ts,tsx}': files => [
    `npx eslint --fix ${quote(files)}`,
    `npx prettier --write ${quote(files)}`,
  ],
  '**/*.{json,md,yaml,yml}': files => [`npx prettier --write ${quote(files)}`],
};
