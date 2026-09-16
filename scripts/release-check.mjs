#!/usr/bin/env node
/**
 * 템플릿 · CLI · npm 세 곳의 버전이 어긋났는지 본다.
 *
 * 릴리즈는 네 군데를 같이 올려야 하는데(템플릿 태그 · CLI `TEMPLATE_REF` · CLI 태그 ·
 * npm) 손으로 하면 하나씩 빠진다. 빠지면 `npx create-lesa-app` 이 **옛 템플릿을 준다** —
 * 조용히. 그래서 릴리즈 전후에 이걸 돌린다.
 *
 *   node scripts/release-check.mjs
 *
 * CLI 레포 경로는 기본이 형제 폴더이고 `$LESA_CLI_DIR` 로 바꾼다.
 */

import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const TEMPLATE_DIR = process.cwd();
const CLI_DIR = process.env.LESA_CLI_DIR ?? path.resolve(TEMPLATE_DIR, '../create-lesa-app');

const ok = (v) => `\x1b[32m✓\x1b[0m ${v}`;
const bad = (v) => `\x1b[31m✗\x1b[0m ${v}`;

async function git(dir, args) {
  const { stdout } = await run('git', ['-C', dir, ...args]);
  return stdout.trim();
}

/** 최신 semver 태그. `git describe` 는 도달 가능한 것만 보므로 정렬로 고른다. */
async function latestTag(dir) {
  const tags = (await git(dir, ['tag', '-l', 'v*.*.*'])).split('\n').filter(Boolean);
  return tags.sort((a, b) => collate(a) - collate(b)).at(-1) ?? null;
}

function collate(tag) {
  const [major, minor, patch] = tag.replace(/^v/, '').split('.').map(Number);
  return major * 1e6 + minor * 1e3 + patch;
}

const pkgVersion = (dir) => JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).version;

function templateRef(dir) {
  const source = readFileSync(path.join(dir, 'src/fetch-template.ts'), 'utf8');
  const match = /TEMPLATE_REF = '([^']+)'/.exec(source);
  if (!match) throw new Error('TEMPLATE_REF 를 찾지 못했다 — fetch-template.ts 가 바뀌었다');
  return match[1];
}

async function npmLatest(name) {
  try {
    // 레지스트리를 직접 본다 — `npm view` 는 캐시 때문에 방금 올린 것을 놓친다.
    const response = await fetch(`https://registry.npmjs.org/${name}`);
    if (!response.ok) return null;
    const body = await response.json();
    return body['dist-tags']?.latest ?? null;
  } catch {
    return null;
  }
}

async function tarballStatus(repo, tag) {
  try {
    const response = await fetch(
      `https://codeload.github.com/${repo}/tar.gz/refs/tags/${tag}`,
      { method: 'HEAD', redirect: 'follow' }
    );
    return response.status;
  } catch {
    return 0;
  }
}

async function main() {
  if (!existsSync(CLI_DIR)) {
    console.error(`CLI 레포를 찾지 못했다: ${CLI_DIR}\n  $LESA_CLI_DIR 로 경로를 준다.`);
    process.exit(2);
  }

  const [templateTag, cliTag] = await Promise.all([latestTag(TEMPLATE_DIR), latestTag(CLI_DIR)]);
  const templatePkg = pkgVersion(TEMPLATE_DIR);
  const cliPkg = pkgVersion(CLI_DIR);
  const ref = templateRef(CLI_DIR);
  const [published, tarball] = await Promise.all([
    npmLatest('create-lesa-app'),
    tarballStatus('LESANF/react-native-template-lesa', ref),
  ]);

  const rows = [
    ['템플릿 package.json', templatePkg, `v${templatePkg}` === templateTag],
    ['템플릿 최신 태그', templateTag, true],
    ['CLI TEMPLATE_REF', ref, ref === templateTag],
    ['CLI package.json', cliPkg, `v${cliPkg}` === cliTag],
    ['CLI 최신 태그', cliTag, true],
    ['npm latest', published ?? '(조회 실패)', published === cliPkg],
    [`tarball ${ref}`, String(tarball), tarball === 200],
  ];

  const width = Math.max(...rows.map(([label]) => label.length));
  for (const [label, value, fine] of rows) {
    console.log(`  ${(fine ? ok : bad)(label.padEnd(width))}  ${value}`);
  }

  const problems = [];
  if (ref !== templateTag) {
    problems.push(
      `CLI 가 ${ref} 를 가리키는데 템플릿 최신은 ${templateTag} 다 — ` +
        `\`npx create-lesa-app\` 이 옛 템플릿을 준다. src/fetch-template.ts 를 올린다.`
    );
  }
  if (`v${templatePkg}` !== templateTag) {
    problems.push(`템플릿 package.json(${templatePkg}) 과 태그(${templateTag}) 가 다르다.`);
  }
  if (`v${cliPkg}` !== cliTag) {
    problems.push(`CLI package.json(${cliPkg}) 과 태그(${cliTag}) 가 다르다.`);
  }
  if (published && published !== cliPkg) {
    problems.push(
      `npm latest 가 ${published} 인데 CLI 는 ${cliPkg} 다 — ` +
        `\`cd ${CLI_DIR} && npm publish\` 가 남았다.`
    );
  }
  if (tarball !== 200) {
    problems.push(`${ref} tarball 이 HTTP ${tarball} 다 — 태그가 없거나 지워졌다.`);
  }

  if (problems.length === 0) {
    console.log('\n  세 곳이 맞다. 릴리즈 체인에 빠진 단계가 없다.');
    return;
  }
  console.log('');
  for (const problem of problems) console.log(`  ${bad(problem)}`);
  process.exitCode = 1;
}

await main();
