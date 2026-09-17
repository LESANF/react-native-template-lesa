# patches/

pnpm 패치. `pnpm-workspace.yaml` 의 `patchedDependencies` 에 등록돼 있고 `pnpm install` 때 적용된다.
**패치는 정확한 버전에 묶인다** — 그 패키지의 버전을 올리면 여기도 같이 다시 만든다(`pnpm patch <pkg>@<ver>`).

## 이력

패치를 넣거나 뺄 때 한 줄씩 남긴다. 지운 것도 지우지 않는다 — 왜 있었는지가 다음 사람의 판단 근거다.

| 날짜       | 패키지                        | 왜                                                                 | 상태                                                                                       |
| ---------- | ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 2026-09-15 | `expo@57.0.22`                | Xcode 27 SDK 가 UIScene 을 요구 — AppDelegate 에 scene 진입점 주입 | **2026-09-16 제거.** 공식 `expo-build-properties` `ios.enableSceneSupport` 로 대체(v0.0.6) |
| 2026-09-17 | `@bacons/apple-targets@4.0.6` | 타깃이 이미 있는 prebuild(`--no-clean`)에서 크래시 — 아래 절       | **유지 중.** 업스트림 #206 미리뷰, 5.0.0 도 같음                                           |

## `@bacons/apple-targets@4.0.6`

**무엇** — `applyXcodeChanges` 에서 타깃이 이미 있을 때(`prebuild --no-clean`, 2회차 이후) 기존
`buildConfigurationList` 를 지우는 루프가 도는 도중에 그 프로퍼티가 `undefined` 로 바뀌어
`Cannot read properties of undefined (reading 'removeFromProject')` 로 죽는다. 타깃 자신도 그 리스트의
referrer 라서 `removeReference` 가 `props.buildConfigurationList = undefined` 로 만들기 때문이다.
패치는 루프 전에 리스트를 변수로 잡아두고 그 변수로 지운다.

**언제 터지나** — `targets/` 가 있고 clean 이 아닌 prebuild 를 돌릴 때. 첫 prebuild 는 통과한다.

**업스트림** — 이슈 [#201](https://github.com/EvanBacon/expo-apple-targets/issues/201),
같은 수정의 PR [#206](https://github.com/EvanBacon/expo-apple-targets/pull/206)
(더 넓은 수정은 #199·#183). 2026-09 기준 셋 다 리뷰 없이 열려 있고 5.0.0 도 같은 코드다.
5.0.0 으로 올려도 이 패치를 재타깃해야 한다.

**지우는 조건** — 아래가 1 이상이면 릴리즈에 수정이 들어온 것이다. 그때 패치와 등록 줄을 지운다.

```bash
grep -c previousConfigurationList node_modules/@bacons/apple-targets/build/with-xcode-changes.js
```

**검증** — 푸시가 켜진 상태에서 `npx expo prebuild -p ios --no-install` 을 두 번(두 번째는 `--no-clean`)
돌려 둘 다 `Finished prebuild` 면 살아 있다.
