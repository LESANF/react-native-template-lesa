/** prettier 가 eslint 에 안 붙어 있어 ts/tsx 는 둘 다 돌린다. */
const quote = files => files.map(file => `"${file}"`).join(' ');

module.exports = {
  '**/*.{js,jsx,ts,tsx}': files => [
    `npx eslint --fix ${quote(files)}`,
    `npx prettier --write ${quote(files)}`,
  ],
  '**/*.{json,md,yaml,yml}': files => [`npx prettier --write ${quote(files)}`],
};
