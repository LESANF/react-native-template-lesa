import { withProjectBuildGradle } from 'expo/config-plugins';

import type { ConfigPlugin } from 'expo/config-plugins';

/**
 * 임시(2026-11-09) — RN prebuilt AAR(react-android · hermes-android)만 `ENTERPRISE_REPOSITORY` 의 미러에서
 * 먼저 받는다. env 가 없으면 아무것도 안 한다. 프록시가 정상화되면 이 파일과 with-plugin.ts 의 한 줄을 지운다.
 * 배경·측정은 README 상단 경고와 `docs/config.md`.
 */

const ALLPROJECTS_REPOSITORIES_REGEX = /\ballprojects\s*\{\s*\n(\s*)repositories\s*\{\s*\n/;
const MARKER = 'ENTERPRISE_REPOSITORY';
// Groovy 작은따옴표 문자열 안에서 `\\.` → `\.`. RN 의 Gradle 플러그인이 자기 미러에 거는 것과 같은 스코프.
const GROUP_REGEX = String.raw`com\\.facebook\\.(react|hermes).*`;

export class RnMavenMirrorPatchError extends Error {}

/** 멱등 — 이미 들어 있으면 그대로 둔다. 앵커가 없으면 throw(조용히 프록시로 떨어지면 아무도 모른다). */
export function patchProjectBuildGradle(contents: string, url: string): string {
  if (contents.includes(MARKER)) return contents;

  const match = ALLPROJECTS_REPOSITORIES_REGEX.exec(contents);
  if (!match) {
    throw new RnMavenMirrorPatchError(
      'android/build.gradle 에서 allprojects.repositories 를 찾지 못했다 — Expo 템플릿이 바뀌었다. ' +
        'plugins/with-rn-maven-mirror.ts 의 ALLPROJECTS_REPOSITORIES_REGEX 를 고친다.'
    );
  }

  const pad = match[1] + match[1];
  const block = [
    `${pad}// ${MARKER} — RN prebuilt AAR 만 이 미러에서 먼저 받는다(README 상단 경고, 임시).`,
    `${pad}maven {`,
    `${pad}  url '${url}'`,
    `${pad}  content { includeGroupByRegex '${GROUP_REGEX}' }`,
    `${pad}}`,
    '',
  ].join('\n');

  return contents.replace(ALLPROJECTS_REPOSITORIES_REGEX, matched => matched + block);
}

const withRnMavenMirror: ConfigPlugin = config => {
  const url = process.env.ENTERPRISE_REPOSITORY;
  if (!url) return config;

  return withProjectBuildGradle(config, gradleConfig => {
    gradleConfig.modResults.contents = patchProjectBuildGradle(
      gradleConfig.modResults.contents,
      url
    );
    return gradleConfig;
  });
};

export default withRnMavenMirror;
