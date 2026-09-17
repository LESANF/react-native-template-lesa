# 이미 만든 프로젝트를 올리는 방법

`create-lesa-app` 은 **한 번 쓰는 스캐폴드**다. 템플릿을 릴리즈해도 이미 만든 프로젝트는
따라오지 않는다 — 의존성이 아니기 때문이다. 그래서 만든 시점에 따라 손으로 옮겨야 한다.

만든 템플릿 버전은 프로젝트 루트에서 확인한다. CLA 는 초기 커밋을 남기므로 그 시점의
`package.json` 이 아니라 **`CHANGELOG.md` 의 맨 위 버전**을 본다(생성 시 지워지므로,
없으면 아래 표의 특징으로 판별한다).

| 무엇이 있나                                                                    | 그 버전         |
| ------------------------------------------------------------------------------ | --------------- |
| `targets/notification-service/` 가 있고 `package.json` 에 `engines.pnpm`       | v0.0.9          |
| `enableSceneSupport` 와 `expo-build-properties` `~57.0.20`, `targets/` 없음    | v0.0.7 · v0.0.8 |
| `patches/expo@57.0.22.patch` 와 `plugins/with-ios-scene.ts`                    | v0.0.4 · v0.0.5 |
| `app.config.ts` 에 `enableSceneSupport`, `expo-build-properties` 가 `~57.0.19` | v0.0.6          |
| 위 둘 다 없고 `expo` 가 `~57.0.22`                                             | v0.0.3 이하     |

---

## v0.0.7 · v0.0.8 에서 올리기 — pnpm 핀과 NSE

둘은 독립이다. pnpm 은 전부에 권하고, NSE 는 iOS 리치 푸시 이미지가 필요할 때만.

**pnpm.** `packageManager: pnpm@11.10.0` 이 corepack 심을 그 버전으로 내려 전역 pnpm 을 무력화한다.

```bash
# package.json: "packageManager" 줄을 지우고 아래를 넣는다
#   "engines": { "node": ">=22", "pnpm": ">=12" }
# .github/workflows/ci.yml: pnpm/action-setup 에 with: version: 12
pnpm -v   # 프로젝트 안에서 전역과 같은 버전이 나오면 끝. lockfile 형식은 11·12 동일
```

**NSE.** 파일은 손으로 옮기지 말고 그 태그에서 그대로 받는다.

```bash
T=https://raw.githubusercontent.com/LESANF/react-native-template-lesa/v0.0.9
mkdir -p targets/notification-service patches
for f in expo-target.config.js Info.plist NotificationService.swift; do
  curl -fsSL "$T/targets/notification-service/$f" -o "targets/notification-service/$f"; done
curl -fsSL "$T/patches/@bacons__apple-targets@4.0.6.patch" -o "patches/@bacons__apple-targets@4.0.6.patch"
curl -fsSL "$T/patches/README.md" -o patches/README.md
pnpm add @bacons/apple-targets@4.0.6
# pnpm-workspace.yaml 끝에:
#   patchedDependencies:
#     '@bacons/apple-targets@4.0.6': patches/@bacons__apple-targets@4.0.6.patch
# .gitignore 에:  targets/**/generated.entitlements
# app.config.ts 의 PUSH_PLUGINS 위에:
#   const nseEnabled = pushEnabled && existsSync('./targets/notification-service');
#   … 배열 첫 항목으로  ...(nseEnabled ? ['@bacons/apple-targets' as const] : []),
pnpm install
grep -c previousConfigurationList node_modules/@bacons/apple-targets/build/with-xcode-changes.js   # 1 이상이면 패치 적용
```

확인은 `firebase/` 를 채운 상태에서 prebuild 를 **두 번**(두 번째는 `--no-clean`) — 둘 다 `Finished prebuild`
여야 한다. 실기는 `<bundleId>.ImageNotification` 프로비저닝 프로필이 따로 필요하다. 테스트 이미지는
JPEG·PNG 로(SVG 는 첨부가 안 된다).

## v0.0.6 에서 올리기 — 한 줄

`expo-build-properties` 를 올린다. **푸시를 켜면 prebuild 가 실패하는 버그**가 있다.

```bash
npx expo install expo-build-properties   # ~57.0.20 이상으로
```

`pnpm-workspace.yaml` 에 `minimumReleaseAgeExclude` 가 있으면 새 버전을 거기 넣는다.
안 넣으면 pnpm 이 정책으로 막고 옛 버전에 머문다.

확인:

```bash
node -p "require('./node_modules/expo-build-properties/package.json').version"
```

## v0.0.4 · v0.0.5 에서 올리기 — 패치를 버린다

이 두 버전은 iOS 27 UIScene 을 **직접 패치**해서 해결했다. 공식이 나왔으니 지운다.

```bash
# 1. 패치 제거
rm -rf patches
#    pnpm-workspace.yaml 에서 patchedDependencies 블록을 지운다

# 2. 자체 플러그인 제거
rm plugins/with-ios-scene.ts
#    plugins/with-plugin.ts 에서 withIosScene import 와 호출 줄을 지운다

# 3. 의존성
npx expo install expo expo-build-properties   # expo ~57.0.23+, bp ~57.0.20+

# 4. app.config.ts 의 expo-build-properties 옵션에 한 줄
#      ios: { useFrameworks: 'static', enableSceneSupport: true },

# 5. 재생성
rm -rf ios && npx expo prebuild -p ios
```

확인 — 아래 둘이 나와야 한다.

```bash
/usr/libexec/PlistBuddy -c "Print :UIApplicationSceneManifest:UISceneConfigurations:UIWindowSceneSessionRoleApplication:0:UISceneDelegateClassName" ios/*/Info.plist
# → EXExpoAppSceneDelegate
grep -c "UIWindow(frame" ios/*/AppDelegate.swift
# → 0
```

## v0.0.3 이하에서 올리기 — Xcode 27 대응이 아예 없다

**Xcode 27(iOS 27 SDK)로 빌드하면 앱이 실행되지 않는다.** 빌드는 성공하고 실행에서 죽는다.

```
Application failed to launch: UIScene life cycle is required for apps built with this SDK.
```

위 "v0.0.4 · v0.0.5" 의 **3~5 단계만** 하면 된다(지울 패치·플러그인이 없다).

---

## 아이콘 배지가 어긋나 보이면 (v0.0.4 이하)

`app-icon-badge` 오버레이는 **1024×1024 고정**이고 `(0,0)` 에 합성된다. 아이콘이 그보다
크면 배너가 폭을 다 덮지 못하고 하단이 아닌 곳에 앉는다.

```bash
sips -z 1024 1024 assets/images/icon.png
```

`adaptive-icon.png` 은 **풀블리드가 아니라 여백 있는 foreground** 여야 한다 — Android
런처 마스크가 108dp 중 가운데 72dp 만 보장하므로 풀블리드는 가장자리가 잘린다.
아이콘 파이프라인이 두 산출물을 따로 내면 각각 쓴다.

---

## 옮긴 뒤 검증

```bash
npx expo install --check     # Dependencies are up to date
npx expo-doctor              # 전부 통과
CI=true pnpm run check-all   # lint · tsc · test
rm -rf ios && npx expo prebuild -p ios && npx expo run:ios
```

**푸시를 쓰면 `firebase/` 에 설정 파일을 넣은 상태로도 prebuild 를 돌려본다.** 파일이
없으면 푸시 경로가 비활성이라 그쪽 문제가 드러나지 않는다 — v0.0.6 이 그렇게 나갔다.

버전별 변경 내역은 [CHANGELOG.md](./CHANGELOG.md) 와
[릴리즈 노트](https://github.com/LESANF/react-native-template-lesa/releases).
