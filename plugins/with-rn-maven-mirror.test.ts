/**
 * RN prebuilt AAR 미러 주입. 앵커가 어긋나면 조용히 프록시로 떨어져 빌드가 몇십 분 멈추는데,
 * 그걸 플러그인 탓으로 떠올릴 사람은 없다 — 그래서 throw 해야 한다.
 */
import { RnMavenMirrorPatchError, patchProjectBuildGradle } from './with-rn-maven-mirror';

const URL = 'https://maven-central.storage-download.googleapis.com/maven2';

const EXPO_TEMPLATE = `buildscript {
  repositories {
    google()
    mavenCentral()
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
    maven { url 'https://www.jitpack.io' }
  }
}

apply plugin: "expo-root-project"
`;

describe('patchProjectBuildGradle', () => {
  it('allprojects.repositories 맨 앞에 스코프된 미러를 넣는다 — buildscript 는 건드리지 않는다', () => {
    const out = patchProjectBuildGradle(EXPO_TEMPLATE, URL);
    const allprojects = out.slice(out.indexOf('allprojects'));
    expect(allprojects.indexOf(`url '${URL}'`)).toBeLessThan(allprojects.indexOf('google()'));
    expect(allprojects).toContain("includeGroupByRegex 'com\\\\.facebook\\\\.(react|hermes).*'");
    expect(out.slice(0, out.indexOf('allprojects'))).not.toContain(URL);
  });

  it('멱등이다 — 두 번 돌려도 같다', () => {
    const once = patchProjectBuildGradle(EXPO_TEMPLATE, URL);
    expect(patchProjectBuildGradle(once, URL)).toBe(once);
  });

  it('allprojects.repositories 를 못 찾으면 throw 한다', () => {
    expect(() => patchProjectBuildGradle('buildscript {\n  repositories {\n  }\n}\n', URL)).toThrow(
      RnMavenMirrorPatchError
    );
  });
});
