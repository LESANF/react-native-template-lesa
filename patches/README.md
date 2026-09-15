# Xcode 27 / iOS 27 SDK — UIScene 생명주기

iOS 27 SDK 로 빌드한 앱은 **UIScene 생명주기를 채택해야 실행된다.** 안 하면 빌드는 되고
실행에서 죽는다.

```
Application failed to launch: UIScene life cycle is required for apps built with this SDK.
```

SDK 57 템플릿은 `AppDelegate` 가 window 를 만들기 때문에 그대로는 뜨지 않는다. SDK 58 이
정식 채택하지만 아직 `preview` 다.

|                              |                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `patches/expo@57.0.22.patch` | `ExpoAppSceneDelegate` · `ExpoReactNativeFactoryProvider` · `SceneEventForwarder` 세 파일 추가 |
| `plugins/with-ios-scene.ts`  | Info.plist scene manifest · AppDelegate 에서 window 생성 제거 · `SceneDelegate` 선언           |

출처는 [expo/expo#50026](https://github.com/expo/expo/pull/50026) 커밋
`008a21874e177800f983be16f5c14315e96f33fd` — **SDK 57 을 타깃하는 공식 백포트 PR 이고
아직 열려 있다.** 파일을 그대로 가져왔고 손으로 고친 것은 없다.

SDK 54 에서는 네 패키지를 패치해야 했지만 57 에서는 `expo` 하나로 끝난다 —
`SceneGeometry` 가 `expo-modules-core` 57 에 이미 있고, `@expo/cli` 57.0.24 에 DeviceHub
fallback 이 들어 있고([#46757](https://github.com/expo/expo/pull/46757)), Pod 배포타깃
상향도 Expo 가 prebuild 에서 직접 한다.

## 제거 조건

**#50026 이 57.0.x 에 머지되면 패치와 플러그인을 같이 지운다.** 확인 방법:

```bash
grep -rl ExpoAppSceneDelegate node_modules/expo/ios/   # 패치 없이 나오면 upstream 에 들어온 것
```

패치는 정확한 버전에 묶여 있다(`expo@57.0.22`). `expo` 를 올리기 전에 그 버전에 이미
들어갔는지 확인하고, 안 들어갔으면 패치를 새로 만든다. **쓰지 않는 버전의 패치를 등록해
두지 않는다** — pnpm 이 조용히 무시하고 앱은 실행되지 않는다.

## 검증

`plugins/with-ios-scene.ts` 는 앵커를 못 찾으면 **throw 한다.** 조용히 빠지면 실행에서야
드러나기 때문이다. prebuild 후 아래가 맞아야 한다.

```bash
/usr/libexec/PlistBuddy -c "Print :UIApplicationSceneManifest" ios/*/Info.plist
grep -nE "ExpoReactNativeFactoryProvider|class SceneDelegate" ios/*/AppDelegate.swift
```

2026-09-15 확인: prebuild → pod install → `xcodebuild` **BUILD SUCCEEDED**(error 0, 세 Swift
파일 컴파일 확인). **실기·시뮬 실행과 딥링크 왕복은 확인하지 않았다** — scene 생명주기에서는
링크가 AppDelegate 로 오지 않고 `SceneEventForwarder` 가 넘긴다. 콜드 `Linking.getInitialURL()`
보존이 첫 실행에서 확인해야 할 항목이다.
