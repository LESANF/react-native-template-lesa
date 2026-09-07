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
    /**
     * ASCII 로 둔다. Expo prebuild 가 이 값에서 iOS Xcode 프로젝트·스킴·PRODUCT_NAME 을
     * 파생하면서 non-word 문자를 전부 지우는데(`sanitizedName`, 정규식에 u 플래그 없음)
     * 한글·가나만인 이름은 전부 날아가 프로젝트가 `app` 이 된다. 홈 화면 이름은 displayName.
     */
    name: 'write-your-app-name',
    /**
     * 홈 화면에 보이는 이름 — 비우면 `name` 을 그대로 쓴다(기본).
     * 채우면 iOS 는 `CFBundleDisplayName`, Android 는 strings.xml 의 `app_name` 만 바뀌고
     * 프로젝트·스킴 이름은 ASCII `name` 을 유지한다.
     * TODO(앱): 앱 이름이 한글·일본어면 여기 채운다 (예: '워크아웃').
     */
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
