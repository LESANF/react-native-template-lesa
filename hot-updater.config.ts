import 'tsx/cjs';
import './scripts/load-build-env.cjs';

import { s3Storage } from '@hot-updater/aws';
import { expo } from '@hot-updater/expo';
import { standaloneRepository } from '@hot-updater/standalone';
import { defineConfig } from 'hot-updater';

import { APP_ENV, Env } from './env';

// OTA 배포 설정 (CLI 전용 — 앱 번들에 들어가지 않는다). 런타임 서버 주소는 env-candidates의 urls.ota.
// TODO(앱): 환경별 S3 버킷·리전. 시크릿은 .env의 APP_BUILD_ONLY_AWS_*.
const S3_BUCKETS = {
  development: 'write-your-ota-bucket-dev',
  preview: 'write-your-ota-bucket-dev',
  production: 'write-your-ota-bucket',
} as const;
const AWS_REGION = 'ap-northeast-2';

export default defineConfig({
  updateStrategy: 'fingerprint',
  build: expo({ sourcemap: false }),
  storage: s3Storage({
    bucketName: S3_BUCKETS[APP_ENV],
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.APP_BUILD_ONLY_AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.APP_BUILD_ONLY_AWS_SECRET_ACCESS_KEY ?? '',
    },
  }),
  database: standaloneRepository({ baseUrl: Env.urls.ota }),
});
