import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const INPUT_PATH = fileURLToPath(
  new URL('../src/styles/tokens/colors.css', import.meta.url),
);
const OUTPUT_PATH = fileURLToPath(
  new URL('../src/styles/tokens/colors.ts', import.meta.url),
);

class TokenParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TokenParseError';
  }
}

function parseColorEntries(css) {
  const entries = [];
  const tokenPattern = /^\s*--color-([a-z0-9-]+):\s*([^;]+);\s*$/gim;
  let match = tokenPattern.exec(css);

  while (match !== null) {
    const [, rawName, rawValue] = match;
    if (rawName === undefined || rawValue === undefined) {
      throw new TokenParseError('Unable to parse color token.');
    }

    entries.push({
      name: rawName,
      value: rawValue.trim(),
    });
    match = tokenPattern.exec(css);
  }

  if (entries.length === 0) {
    throw new TokenParseError('No --color-* tokens found in colors.css.');
  }

  return entries;
}

function quoteKey(key) {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) || /^[0-9]+$/.test(key)) {
    return key;
  }

  return JSON.stringify(key);
}

function setNestedToken(target, path, value) {
  const [head, ...tail] = path;
  if (head === undefined) {
    throw new TokenParseError('Color token path cannot be empty.');
  }

  if (tail.length === 0) {
    target.set(head, value);
    return;
  }

  const current = target.get(head);
  if (typeof current === 'string') {
    throw new TokenParseError(`Color token conflict at ${path.join('-')}.`);
  }

  const next = current ?? new Map();
  target.set(head, next);
  setNestedToken(next, tail, value);
}

function buildTokenTree(entries) {
  const tree = new Map();

  for (const entry of entries) {
    setNestedToken(tree, entry.name.split('-'), entry.value);
  }

  return tree;
}

function formatTree(tree, depth = 1) {
  const lines = [];
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  for (const [key, value] of tree) {
    if (typeof value === 'string') {
      lines.push(`${indent}${quoteKey(key)}: ${JSON.stringify(value)},`);
      continue;
    }

    lines.push(`${indent}${quoteKey(key)}: {`);
    lines.push(...formatTree(value, depth + 1));
    lines.push(`${childIndent.slice(2)}},`);
  }

  return lines;
}

function buildColorsTs(css) {
  const tree = buildTokenTree(parseColorEntries(css));

  return [
    'type ColorTokenTree = {',
    '  readonly [name: string]: string | ColorTokenTree;',
    '};',
    '',
    'export const colors = {',
    ...formatTree(tree),
    '} as const satisfies ColorTokenTree;',
    '',
  ].join('\n');
}

async function main() {
  const css = await readFile(INPUT_PATH, 'utf8');
  const next = buildColorsTs(css);

  if (process.argv.includes('--check')) {
    const current = await readFile(OUTPUT_PATH, 'utf8');
    if (current !== next) {
      throw new TokenParseError('colors.ts is out of sync. Run pnpm tokens:generate.');
    }
    return;
  }

  await writeFile(OUTPUT_PATH, next);
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
