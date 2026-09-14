/**
 * release 서명 주입. AGP 템플릿이 바뀌면 앵커가 어긋나는데, 조용히 넘어가면
 * debug 키로 서명된 릴리즈가 스토어로 나간다 — 그래서 throw 해야 한다.
 */
import { AndroidSigningPatchError, patchAppBuildGradle } from './with-android-plugin';

const EXPO_TEMPLATE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds')?.toBoolean() ?: false)
            minifyEnabled enableProguardInReleaseBuilds
        }
    }
}`;

const releaseSigningOf = (gradle: string) =>
  /buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+signingConfigs\.(\w+)/.exec(
    gradle
  )?.[1];

describe('patchAppBuildGradle', () => {
  it('release 서명 블록을 넣고 buildTypes 가 그것을 가리키게 한다', () => {
    const out = patchAppBuildGradle(EXPO_TEMPLATE);
    expect(out).toContain('ANDROID_UPLOAD_KEYSTORE_PATH');
    expect(releaseSigningOf(out)).toBe('release');
  });

  it('debug 블록은 건드리지 않는다', () => {
    const out = patchAppBuildGradle(EXPO_TEMPLATE);
    expect(out).toContain("storeFile file('debug.keystore')");
    expect(/buildTypes\s*\{\s*debug\s*\{\s*signingConfig signingConfigs\.debug/.test(out)).toBe(
      true
    );
  });

  it('멱등이다 — 두 번 돌려도 같다', () => {
    const once = patchAppBuildGradle(EXPO_TEMPLATE);
    expect(patchAppBuildGradle(once)).toBe(once);
  });

  it('release 가 이미 서명을 갖고 있어도 우리 것으로 바꾼다', () => {
    const withRelease = EXPO_TEMPLATE.replace(
      "        debug {\n            storeFile file('debug.keystore')",
      "        release {\n            storeFile file('other.jks')\n        }\n        debug {\n            storeFile file('debug.keystore')"
    );
    const out = patchAppBuildGradle(withRelease);
    expect(out).toContain('ANDROID_UPLOAD_KEYSTORE_PATH');
    expect(out).not.toContain("file('other.jks')");
  });

  it('signingConfigs 를 못 찾으면 throw 한다 — 없는 블록을 가리키게 두지 않는다', () => {
    const noSigningConfigs = `android {
    buildTypes {
        release {
            signingConfig signingConfigs.debug
        }
    }
}`;
    expect(() => patchAppBuildGradle(noSigningConfigs)).toThrow(AndroidSigningPatchError);
  });

  it('signingConfigs 와 buildTypes 사이에 주석이 끼면 throw 한다 (실측 회귀)', () => {
    const withComment = EXPO_TEMPLATE.replace(
      '    }\n    buildTypes {',
      '    }\n\n    // AGP 주석\n    buildTypes {'
    );
    expect(() => patchAppBuildGradle(withComment)).toThrow(/signingConfigs 블록을 찾지 못했다/);
  });

  it('buildTypes.release 에 걸지 못하면 throw 한다 — debug 서명이 남으면 안 된다', () => {
    const noReleaseBuildType = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
    }
}`;
    expect(() => patchAppBuildGradle(noReleaseBuildType)).toThrow(/debug 키로 서명된 릴리즈/);
  });
});
