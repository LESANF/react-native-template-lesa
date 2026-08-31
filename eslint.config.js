// https://docs.expo.dev/guides/using-eslint/
const path = require('node:path');
const process = require('node:process');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const betterTailwindcss = require('eslint-plugin-better-tailwindcss');

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

  // ── 구조 규칙 ──────────────────────────────────────────────────────
  // 구조적 이름은 app / features / providers 셋뿐.
  // 그 외 모든 폴더(현재·미래)는 자동으로 "shared 계층"으로 취급된다.
  //
  // error = 구조 사고 (역방향 의존)
  // warn  = 가시화만 (결합·barrel 가이드 — 빌드를 막지 않음)
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/!(app|features|providers)/**',
              from: './src/features',
              message: 'shared 계층은 features를 모릅니다 — 도메인 무관 코드만 둡니다.',
            },
            {
              target: './src/!(app)/**',
              from: './src/providers',
              message: 'providers는 루트 조립 전용 — app/_layout 만 소비합니다.',
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              regex: '^@/components/ui/.+',
              message: 'ui 컴포넌트는 barrel 경유 권장: @/components/ui',
            },
            {
              regex: '^@/features/[^/]+$',
              message:
                'feature barrel 비권장 (Metro는 트리셰이킹을 안 합니다) — 전체 경로로 import 하세요.',
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
            {
              regex: '^@/features/',
              message:
                'cross-feature 결합 — 공용이면 components/ui 로 승격(Rule of Three), 아니면 의도적 수용인지 확인하세요.',
            },
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
