#!/usr/bin/env node
// OTA 번들 배포: prebuild(클린) → fingerprint → hot-updater deploy. KR/JP 앱과 동일 절차.
//   pnpm ota:deploy:ios:production     (= EXPO_PUBLIC_APP_ENV=production node scripts/ota-deploy.mjs ios)
//   node scripts/ota-deploy.mjs android -m "핫픽스: 결제 버튼"
// 환경은 EXPO_PUBLIC_APP_ENV로 명시해야 한다(기본 development로 흘러가는 배포를 막기 위해).
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const [platform, ...rest] = process.argv.slice(2);
if (platform !== 'ios' && platform !== 'android') {
  console.error('Usage: node scripts/ota-deploy.mjs <ios|android> [-m <message>]');
  process.exit(1);
}
const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
if (appEnv !== 'preview' && appEnv !== 'production') {
  console.error('EXPO_PUBLIC_APP_ENV must be preview or production for OTA deploy.');
  process.exit(1);
}
const messageIndex = rest.findIndex(arg => arg === '-m' || arg === '--message');
const userMessage = messageIndex >= 0 ? rest[messageIndex + 1] : undefined;

const run = (cmd, args, extraEnv = {}) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const out = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim();

const dirty = out('git', ['status', '--porcelain']);
if (dirty)
  console.warn('\n⚠️  커밋되지 않은 변경이 있습니다. 이 번들은 특정 커밋에 대응하지 않습니다.\n');
const sha = out('git', ['rev-parse', '--short', 'HEAD']) + (dirty ? '-dirty' : '');
const message = userMessage ? `${userMessage} [${sha}]` : `[${sha}]`;

// 항상 클린 상태에서 프리빌드 → fingerprint 해시가 결정적이다.
rmSync(platform, { recursive: true, force: true });
run('pnpm', ['exec', 'expo', 'prebuild', '-p', platform], { STRICT_ENV_VALIDATION: '1' });
run('pnpm', ['exec', 'hot-updater', 'fingerprint', 'create']);
run('pnpm', ['exec', 'hot-updater', 'deploy', '-p', platform, '-c', 'production', '-m', message]);

const fingerprint = JSON.parse(readFileSync('fingerprint.json', 'utf8'));
console.log(
  `\n✅ deployed ${platform} (${appEnv}) — fingerprint ${fingerprint?.[platform]?.hash ?? '(see fingerprint.json)'}`
);
