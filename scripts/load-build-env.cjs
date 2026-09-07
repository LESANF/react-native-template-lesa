// 빌드 시크릿(.env의 APP_BUILD_ONLY_*)을 CLI 프로세스에 올린다. Expo CLI는 .env를 스스로 읽지만
// hot-updater CLI는 읽지 않으므로 hot-updater.config.ts가 가장 먼저 import한다.
// dotenv 의존성 없이 Node 내장 API(loadEnvFile, Node 20.12+)만 쓴다. 타입체크 대상 밖(.cjs)이라 @types/node 불필요.
const { existsSync } = require('node:fs');

if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}
