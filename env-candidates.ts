/**
 * env-candidates.ts — 이 앱의 모든 환경 설정값.
 *
 * ─ 사용법 ────────────────────────────────────────────────────────────
 * 일상적으로 편집하는 파일은 이것 하나입니다.
 *
 * 1. 모든 환경에서 같은 값  → 그냥 값을 적는다.
 *      name: 'MyApp'
 *
 * 2. 환경마다 다른 값(후보) → { development, preview, production } 객체.
 *      apiUrl: { development: '...', preview: '...', production: '...' }
 *    env.ts 의 defineEnv 가 현재 EXPO_PUBLIC_APP_ENV 에 맞는 값을
 *    자동으로 당선시킵니다. 세 키 중 하나라도 빠지면 즉시 throw.
 *
 * ─ 규칙 ──────────────────────────────────────────────────────────────
 * - 이 파일은 순수 데이터입니다. import 금지 (순환 참조 원천 차단).
 * - 시크릿 금지 — 여기 값은 전부 클라이언트 번들에 들어갑니다.
 *   빌드 시크릿은 .env 에 두고 app.config.ts 에서만 읽습니다.
 * - 사용처에서는 `import Env from '@env'` 후 `Env.identity.bundleId` 처럼
 *   접근합니다. 환경 분기는 이미 끝난 평범한 값입니다.
 */
export const values = {
  identity: {
    name: 'write-your-app-name',
    slug: 'write-your-app-slug',
    scheme: {
      development: 'write-your-scheme-dev',
      preview: 'write-your-scheme-preview',
      production: 'write-your-scheme',
    },
    bundleId: {
      development: 'write.your.bundlename.development',
      preview: 'write.your.bundlename.preview',
      production: 'write.your.bundlename',
    },
    package: {
      development: 'write.your.bundlename.development',
      preview: 'write.your.bundlename.preview',
      production: 'write.your.bundlename',
    },
  },

  version: {
    app: {
      development: '0.0.1',
      preview: '0.0.1',
      production: '0.0.1',
    },
    iosBuildNumber: {
      development: '1',
      preview: '1',
      production: '1',
    },
    androidVersionCode: {
      development: 1,
      preview: 1,
      production: 1,
    },
  },

  urls: {
    api: {
      development: 'https://jsonplaceholder.typicode.com',
      preview: 'https://jsonplaceholder.typicode.com',
      production: 'https://api.example.invalid',
    },
    // OTA(hot-updater) 서버. 빈 문자열 = 비활성(프리로더 ota 스테이지 스킵).
    // TODO(앱): 자체 서버 주소로 교체 (예: 'https://ota.example.com/hot-updater'). 참고: 자체 OTA 서버
    ota: {
      development: '',
      preview: '',
      production: '',
    },
  },

  // services: {
  //   sentryDsn: 'https://...@sentry.io/...',   // 전 환경 공통 값 예시
  // },
} as const;
