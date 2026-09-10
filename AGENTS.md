# 이 프로젝트에서 일하는 법

Expo SDK 57 · React Native 0.86 · New Architecture. **버전이 박혀 있다** —
https://docs.expo.dev/versions/v57.0.0/ 의 그 버전 문서를 보고 쓴다.

순서는 이렇다. **① 도구를 고르고 → ② 섹션 문서를 읽고 → ③ 규칙을 지키고 → ④ 검증을 사용자에게 넘긴다.**

---

# ① 무엇을 할 때 무엇을 쓰나

## 사실 확인은 기억이 아니라 도구로

| 알아야 하는 것                                                | 쓸 것                                                                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Expo API·설정·동작                                            | **expo MCP** `search_documentation` → `read_documentation` ([설정](https://docs.expo.dev/mcp/)) |
| 이 코드베이스의 구조(무엇이 무엇을 부르나·바꾸면 뭐가 깨지나) | **codegraph MCP** `codegraph_explore`                                                           |
| 서드파티 라이브러리 문서                                      | **context7 MCP**                                                                                |
| 문자열·주석·로그 메시지 찾기                                  | grep (이때만 grep 이 맞다)                                                                      |

**Expo 사실을 기억으로 답하지 않는다.** SDK 57 은 이전 버전과 다르고, 기억은 대개 낡았다.
구조 질문에 grep + read 루프를 돌리지 않는다 — codegraph 가 이미 인덱싱한 것을 다시 만드는
일이고 더 비싸다.

```bash
codegraph init -i     # 최초 1회. `.codegraph/` 는 로컬 산출물이라 gitignore 돼 있다
```

`.codegraph/` 가 없으면 MCP 가 "not initialized" 를 돌려준다 — 위 명령을 안내하고, 사용자가
원하지 않으면 grep 으로 진행한다.

## 이 표는 훅으로 자동 주입된다

문서에 적어두는 것만으로는 167줄 안에 묻힌다. `.claude/hooks/route.mjs` 가 세 지점에서
필요한 줄만 꺼내 준다.

| 언제                                   | 무엇                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 세션 시작(`startup`·`clear`·`compact`) | **지금 켜져 있는 것** — codegraph 인덱스·푸시·OTA·NSE·자리표시 잔여. 문서가 가질 수 없는 정보다 |
| 프롬프트 제출                          | 프롬프트에 도메인 단어가 있으면 그 영역의 스킬 한 줄                                            |
| `Grep` 호출 직전                       | 패턴이 식별자 하나면 `codegraph_explore` 를 권한다(막지는 않는다)                               |

**주입문은 참고일 뿐 지시가 아니다.** 안 맞으면 무시하고 판단대로 한다. 패턴은
`route.mjs` 의 `ROUTES` 배열이고, 오탐이 보이면 그 정규식을 좁힌다.

## 영역별 스킬

| 하려는 것                         | 스킬                                                                  |
| --------------------------------- | --------------------------------------------------------------------- |
| **RN/Expo 코드 작성·리뷰·디버깅** | `react-native-best-practices` (Software Mansion · New Arch 기준)      |
| **애니메이션·제스처·햅틱**        | `animate-expo` — Reanimated · Gesture Handler · expo-haptics          |
| 애니메이션 원리·프레임 드랍 진단  | `react-native-animation-patterns` (worklets · shared value · Skia)    |
| 기존 모션 비평                    | `review-animations` / 코드베이스 전체 감사 `improve-animations`       |
| 키보드 회피(폼·모달·바텀시트)     | `rn-keyboard-handling`                                                |
| OTA 운영(배포·롤백·채널)          | `hot-updater` — 이 템플릿의 OTA 엔진이다                              |
| 네이티브 UI 붙이기                | `building-native-ui` · `expo-ui-swift-ui` · `expo-ui-jetpack-compose` |
| dev client 문제                   | `expo-dev-client`                                                     |
| 스토어 배포·CI                    | `expo-deployment` · `expo-cicd-workflows`                             |
| SDK 업그레이드                    | `upgrading-expo`                                                      |
| 설계 전 발산                      | `brainstorming` (superpowers)                                         |
| 원인 모를 버그                    | `systematic-debugging`                                                |
| 완료 선언 전                      | `verification-before-completion`                                      |

> [!WARNING]
> **애니메이션 스킬에 웹 전용이 섞여 있다.** `animate` · `motion-react` · `css-animations` ·
> `animation-performance` 는 CSS·Framer Motion·WAAPI 용이다. RN 에 그 조언을 적용하면
> 안 된다 — `transform`/`opacity` 만 애니메이트하라는 웹 규칙은 Reanimated 에서 의미가
> 다르고, `will-change`·GPU 레이어 같은 건 존재하지 않는다.
> **RN 은 `animate-expo`, 웹은 `animate`.**

---

# ② 섹션별 문서 — 건드리기 전에 읽어라

수정할 폴더로 문서를 찾는다. 각 문서는 **파일 지도 · 확정 결정 · 거부된 대안 · 채우는 곳(`TODO(앱)`) · 검증 상태** 순서다.

| 건드리는 곳                                                                                 | 읽을 문서                                |
| ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `lib/api` · `lib/auth` · `api/` · `stores/auth-store`                                       | [docs/data-layer.md](docs/data-layer.md) |
| `app/splash` · `features/splash` · `lib/preloader` · `lib/deep-link` · OTA · 어트리뷰션 SDK | [docs/boot.md](docs/boot.md)             |
| `lib/push` · `index.js` · `firebase/` · `constants/push`                                    | [docs/push.md](docs/push.md)             |
| `app/` · `features/` · `providers/` · `constants/tabs` · 탭 · 모달                          | [docs/routing.md](docs/routing.md)       |
| `components/ui` · `styles/` · 토큰 · 다크모드 · 배럴 · safe area                            | [docs/ui.md](docs/ui.md)                 |
| `env-candidates.ts` · `env.ts` · `.env` · `app.config.ts` · `plugins/` · 빌드 스크립트      | [docs/config.md](docs/config.md)         |

- [docs/cli.md](docs/cli.md) — `create-lesa-app` 프로젝트 생성 CLI. **치환 대상의 단일 출처** — `env-candidates.ts` 필드를 바꾸면 여기와 CLI 를 같이 고친다
- [docs/decisions.md](docs/decisions.md) — 날짜별 결정 색인(본문은 위 섹션 문서에 있다)
- [docs/template-completion.md](docs/template-completion.md) — 진행 상황과 남은 작업
- [docs/handoff.md](docs/handoff.md) — 세션 인수인계

---

# ③ 이 템플릿의 메커니즘

읽기 전에 손대면 깨지는 것들이다. 규칙이 아니라 **작동 방식**이다.

## 주입 = 활성화

파일이나 값의 **존재**가 기능을 켠다. 코드에 플래그를 두지 않는다.

| 무엇               | 켜는 방법                                                         |
| ------------------ | ----------------------------------------------------------------- |
| 푸시(FCM)          | `firebase/` 에 plist + json 을 **둘 다** 넣는다(하나만이면 throw) |
| OTA                | `env-candidates.ts` 의 `urls.ota` 를 채운다(비면 스테이지 스킵)   |
| EAS                | `eas init` 또는 `app.config.ts` 의 두 줄                          |
| 어트리뷰션 SDK     | `lib/deep-link/attribution.ts` 를 채운다(비면 no-op)              |
| 유니버설 링크      | `constants/deep-link.ts` 의 `DEEP_LINK_HTTPS_HOSTS`               |
| iOS NSE(리치 푸시) | 미포함. `targets/` + `@bacons/apple-targets` 로 붙인다            |

## 값은 한 파일에서만 바꾼다

`env-candidates.ts` → `env.ts`(defineEnv) → `app.config.ts` → prebuild.

`{ development, preview, production }` 모양의 leaf 를 현재 `EXPO_PUBLIC_APP_ENV` 로 접는다.
**`env.ts` 는 기계다 — 값을 그쪽에서 바꾸지 않는다.** 세 키 중 하나라도 빠지면 throw 한다.

production `urls.api` 가 `.invalid` 인 것은 안전장치다. 설정 안 한 프로덕션 빌드를 조용히
내보내지 않으려고 일부러 throw 시킨다.

## 딥링크는 단일 큐로 모인다

OS Linking · 푸시 탭 · 인앱 · 어트리뷰션 SDK — 진입이 어디든 목적지는
`deepLinkDispatcher.enqueue` 하나다. 큐가 cold 진입을 splash 종료까지 붙잡고 2초 창으로
중복을 제거한다. `+native-intent` 는 **리다이렉트만** 한다(enqueue 하면 RN Linking 과 이중).

## 헤드리스 체인은 React 를 모른다

`index.js` → `lib/push/background` → `lib/push/core` → `lib/deep-link/*`.

앱이 죽은 채 OS 가 JS 를 깨우는 경로다. 이 체인에 **React·화면을 import 하면 안 된다**
(스토어는 허용). `index.js` 의 import 순서는 계약이다 — 사이드이펙트가 먼저,
`expo-router/entry` 가 마지막.

## 단방향 import

구조적 이름은 `app` · `features` · `providers` 셋뿐이고 나머지 폴더는 전부 shared 계층이다.

- `providers` 역류 = **error**. 조립 순서가 깨진 것이다
- shared → `features` = **warn**. 대개 그 스토어·타입이 feature 안에 있어야 한다는 신호다
- feature → 다른 feature = **warn**. 공용이면 `components/ui` 로 승격(Rule of Three)

이 규칙이 "폴더를 지우면 그걸로 끝"을 성립시킨다.

## safe area 는 `InsetView`

네이티브 `SafeAreaView` 를 쓰지 않는다. 화면이 애니메이션하는 동안 영역을 재측정해서 탭
전환에서 덜컹거린다. `InsetView` 가 inset 을 일반 `View` 의 스타일로 넣는다.
**탭 안의 화면은 `edges={['top']}` 만** — 하단은 탭바가 이미 먹는다. 상세는 `docs/ui.md`.

## 네이티브는 산출물

`ios/`·`android/` 는 prebuild 산출물이다. 직접 고치면 다음 prebuild 에 날아간다.
네이티브 변경은 `plugins/` 의 config plugin 이나 로컬 Expo Module(`create-expo-module --local`)로 한다.

---

# ④ 반드시 지킬 것

- **거부된 대안을 다시 제안하지 마라.** 각 섹션 문서에 그 절이 있다. 이미 판단이 끝난 것이다.
- **참조 앱(KR/JP)이 스펙이다.** 로컬에 소스가 있다 — 추측하지 말고 열어서 대조한다.
  경로는 `docs/handoff.md`. 단 참조 앱에도 결함이 있으니(문서의 D1~D19) 그대로 베끼지 않는다.
- **메커니즘은 그대로, 정책은 비운다.** 참조 앱에서 이식할 때 안전 탈출 경로·게이트 인프라는
  메커니즘이라 살리고, 테이블·문구·엔드포인트만 비운다.
- **검증은 사용자 몫이다.** 시뮬레이터·실기 조작은 하지 않는다. 코드 검증·구조 확인·
  의존성 점검·빌드까지가 내 범위다. 그 다음은 사용자가 본다.
- **검증 안 된 것을 커밋하지 않는다.** "계속 진행"은 계속 만들라는 뜻이지 자동 커밋이 아니다.
- **코드 주석은 1~3줄.** 모르면 깨지는 것만 남기고, 배경·근거·이력은 `docs/` 에 둔다.
  참조 앱 주석 밀도가 2~3% 다. 한 파일이 12% 를 넘으면 과하다.
- **생성·변환은 결정적으로.** 값을 손으로 옮겨 적지 않는다. 스크립트·도구·파일 복사로 한다.
- **커밋 메시지는 바뀐 것과 그 이유만.** 작업 과정("앞선 조사가 빠뜨렸다" 같은)은 쓰지 않는다.
  Conventional Commits, 한국어 본문.

## 자주 밟는 함정

| 증상                                           | 원인                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| 폴더 탭이 조용히 안 나온다                     | 그 폴더에 `_layout.tsx` 가 없다. 탭 변경은 fast-refresh 로 안 되고 재시작이 필요하다 |
| 고친 코드에 같은 lint 에러가 반복              | `rm -rf .expo/cache/eslint`                                                          |
| iOS 26 비선택 탭 라벨 색이 안 바뀐다           | OS 강제다(expo#44029). selected 만 조정된다                                          |
| 한글 앱 이름을 넣었더니 Xcode 프로젝트가 `app` | `name` 은 ASCII 여야 한다. 홈 화면 이름은 `displayName`                              |
| 새로 만든 파일이 생성 프로젝트에 없다          | CLI 복사 대상이 `git ls-files` 다. `git add` 를 먼저 한다                            |
