/**
 * 이 앱의 환경 설정값. 일상적으로 고치는 파일은 이것 하나다 — 사용법은 `docs/config.md`.
 *
 * - **시크릿 금지.** 여기 값은 전부 클라이언트 번들에 들어간다. 빌드 시크릿은 `.env` 에 두고
 *   `app.config.ts` 에서만 읽는다.
 * - **import 금지.** 순수 데이터여야 순환 참조가 안 생긴다.
 * - `{ development, preview, production }` 은 세 키가 다 있어야 한다 — 하나라도 빠지면 throw.
 */
export const values = {
  identity: {
    /** **ASCII 로 둔다.** prebuild 가 non-word 를 지워서 한글 이름은 프로젝트가 `app` 이 된다. */
    name: 'write-your-app-name',
    /** 홈 화면 이름. 비우면 `name` 을 쓴다. TODO(앱): 한글·일본어 이름이면 여기 채운다. */
    displayName: '',
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
    // 빈 문자열 = OTA 비활성. TODO(앱): 자체 서버 주소로 교체한다.
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
