// https://docs.expo.dev/guides/using-eslint/
const path = require('node:path');
const process = require('node:process');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const betterTailwindcss = require('eslint-plugin-better-tailwindcss');

/**
 * barrel 패턴. flat config 는 **같은 rule 키를 쓰는 블록 중 마지막 것만 적용**하므로
 * 더 좁은 스코프 블록이 이것을 다시 넣어야 한다 — 안 넣으면 조용히 사라진다.
 */
const BARREL_PATTERNS = [
  {
    regex: '^@/components/ui/.+',
    message: 'ui 컴포넌트는 barrel 경유 권장: @/components/ui',
  },
  {
    regex: '^@/api$',
    message: 'api 전역 barrel 금지 — 필요한 concern 파일을 직접 import 하세요.',
  },
  {
    regex: '^@/api/(?!.*(?:requests|queries|mutations|types)$).+',
    message:
      'api barrel 금지 — @/api/<concern>/.../(requests|queries|mutations|types) 를 직접 import 하세요.',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', '.tmp-*/'],
  },

  // ── Tailwind/Uniwind 클래스 검증 ──────────────────────────────────
  // entryPoint = 토큰 진입점(global.css). 잘못된 클래스/중복 공백 등 잡음.
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      'better-tailwindcss': {
        entryPoint: path.resolve(process.cwd(), './src/global.css'),
      },
    },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      'better-tailwindcss/no-unnecessary-whitespace': 'warn',
      'better-tailwindcss/no-unknown-classes': 'off', // 커스텀 유틸(text-display 등) 오탐 방지
      'better-tailwindcss/enforce-consistent-class-order': 'off', // 포맷터가 처리
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
    },
  },

  // 구조적 이름은 app · features · providers 셋뿐. 나머지 폴더는 전부 shared 계층이다.
  // error = 구조 사고(역방향 의존) / warn = 가시화만.
  //
  // **두 severity 는 두 rule 키로 갈라야 한다.** `no-restricted-imports` 는 패턴별,
  // `import/no-restricted-paths` 는 zone 별 severity 를 지원하지 않고, 같은 키를 쓰는
  // 블록은 마지막 것만 적용된다. 그래서 error(providers)는 `import/no-restricted-paths`,
  // warn(나머지)은 `no-restricted-imports` 로 고정한다.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            ...BARREL_PATTERNS,
            {
              regex: '^@/features/[^/]+$',
              message:
                'feature barrel 비권장 (Metro는 트리셰이킹을 안 합니다) — 전체 경로로 import 하세요.',
            },
          ],
        },
      ],
    },
  },

  // shared → features. 대개 배치를 다시 보라는 신호다. 정말 shared 가 도메인을 알아야 하면
  // registry 로 뒤집는다 — `lib/deep-link` 의 spec 테이블이 그 예다.
  {
    files: ['src/!(app|features|providers)/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            ...BARREL_PATTERNS,
            {
              regex: '^@/features/',
              message: 'shared 계층은 features를 모릅니다 — 도메인 무관 코드만 둡니다.',
            },
          ],
        },
      ],
    },
  },

  // providers 역류는 조립 순서가 깨진 것이라 error 로 막는다. 이 키를 쓰는 블록은 여기뿐이다.
  // app 은 소비해야 하고 providers 끼리는 조립하므로 둘은 target 에서 뺀다.
  {
    files: ['src/!(app|providers)/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/!(app|providers)/**',
              from: './src/providers',
              message: 'providers는 루트 조립 전용 — app/_layout 만 소비합니다.',
            },
          ],
        },
      ],
    },
  },

  // cross-feature 결합 가시화 — features 안에서 다른 feature 절대경로 import 시 warn
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            ...BARREL_PATTERNS,
            {
              regex: '^@/features/',
              message:
                'cross-feature 결합 — 공용이면 components/ui 로 승격(Rule of Three), 아니면 의도적 수용인지 확인하세요.',
            },
            {
              regex: '^@/lib/api/query-client$',
              message:
                'features 에서는 useQueryClient() 를 사용하세요. queryClient direct import 는 non-React bootstrap/preloader 전용입니다.',
            },
          ],
        },
      ],
    },
  },
]);
