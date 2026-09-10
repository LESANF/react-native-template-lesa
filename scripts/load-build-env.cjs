// 빌드 시크릿을 CLI 프로세스에 올린다 — hot-updater CLI 는 .env 를 스스로 읽지 않는다.
// Node 내장 loadEnvFile(20.12+)만 쓴다.
const { existsSync } = require('node:fs');

if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}
