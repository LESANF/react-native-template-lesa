# create-lesa-app — 프로젝트 생성 CLI

`npm create lesa-app <dir>` 로 이 템플릿에서 새 프로젝트를 만든다.
CLI 코드는 이 레포가 아니라 `future/ascii-cli-test`(→ `create-lesa-app`)에 있고,
**치환 대상은 이 문서가 단일 출처다** — 템플릿 필드가 바뀌면 여기와 CLI 를 같이 고친다.

## 파일 지도

```
create-lesa-app/                     (별도 레포/디렉터리, npm 발행 대상)
  src/intro.tsx                      .asciimtn 파서 + ink 렌더 (기존 lesa-appkit-intro.tsx)
  src/prompts.tsx                    질문 플로우 (기존 preview.js 의 StepRail·StatusLine·HelpText)
  src/derive.ts                      slug → 전 필드 파생 (순수 함수, 테스트 대상)
  src/apply.ts                       env-candidates.ts 치환 · .env 생성
  src/fetch.ts                       GitHub tarball 다운로드 + 압축 해제
  src/index.ts                       오케스트레이션 + 실패 시 cleanup
  assets/lesa-appkit.asciimtn        인트로 애니메이션
```

## 질문 플로우

```
[인트로 ASCII 애니메이션]

? 앱 이름을 어떻게 쓰시나요?
    › 한글    (예: 워크아웃)
      영문    (예: workout)

── 한글 ──────────────────────────
? 앱 이름 (한글)        워크아웃
? slug (영문, 소문자)   workout

── 영문 ──────────────────────────
? 앱 이름 (영문)        workout        ← slug 로도 쓴다

? Apple Team ID  (선택, Enter 로 건너뛰기)
```

**질문 2~3개.** 한글에서 ASCII 를 자동 변환하지 않는다 — 로마자 변환은 손실이 크고
(`워크아웃` → `weokeuaus`), 이 값이 Xcode 프로젝트명·스킴·`PRODUCT_NAME` 이 된다.

## 파생 규칙

`slug` 하나에서 전부 나온다. production 은 접미사가 없다(템플릿 자리표시와 같은 컨벤션).

| 필드                         | development                | preview              | production   |
| ---------------------------- | -------------------------- | -------------------- | ------------ |
| `identity.name`              | `<slug>` (전 환경 공통)    |                      |              |
| `identity.displayName`       | 한글 입력값, 영문이면 `''` |                      |              |
| `identity.slug`              | `<slug>`                   |                      |              |
| `identity.scheme`            | `<slug>-dev`               | `<slug>-preview`     | `<slug>`     |
| `identity.bundleId`          | `com.<slug>.development`   | `com.<slug>.preview` | `com.<slug>` |
| `identity.package`           | bundleId 와 동일           |                      |              |
| `version.app`                | `0.0.1`                    | `0.0.1`              | `0.0.1`      |
| `version.iosBuildNumber`     | `1`                        | `1`                  | `1`          |
| `version.androidVersionCode` | `1`                        | `1`                  | `1`          |

`slug` 검증: `^[a-z][a-z0-9-]*$`. 대문자·공백·한글은 거부하고 다시 묻는다.
Xcode 프로젝트명은 `sanitizedName()` 이 non-word 를 지우므로 ASCII 가 아니면 `app` 이 된다
(사유 `config.md` "표시명").

## 묻지 않는 것

|                         | 왜                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `urls.api`              | 프로젝트 서버가 정해질 때 채운다. production 은 `.invalid` 로 남아 부팅 throw 가 안전장치다 |
| `urls.ota`              | 빈 값 = OTA 비활성. 자체 서버가 생기면 채운다                                               |
| 유니버설 링크 호스트    | 도메인·AASA 준비가 선행이라 생성 시점에 알 수 없다                                          |
| 에셋 · `firebase/` 파일 | 바이너리라 CLI 가 만들 수 없다                                                              |
| `TODO(앱)` 26곳         | 코드 판단이 필요하다. 생성 후 안내에 `grep` 명령을 남긴다                                   |

## 치환 방법

**`env-candidates.ts` 를 문자열 치환한다** — AST 변환이나 템플릿 엔진을 쓰지 않는다.
자리표시(`write-your-app-name` · `write.your.bundlename.*` 등)가 유일하고 검색 가능해서
`replaceAll` 로 충분하고, 실패하면 자리표시가 남아 눈에 보인다.

치환 후 **남은 `write-your` / `write.your` 를 검사**해서 하나라도 있으면 실패로 본다
(자리표시가 바뀌었는데 CLI 를 안 고친 경우를 잡는다).

`.env` 는 템플릿의 `postinstall` 이 `.env.example` 에서 만든다. Apple Team ID 를 받았으면
CLI 가 `.env` 를 미리 만들어 그 줄만 채운다.

## 생성 순서

1. 대상 디렉터리가 비어 있는지 확인 (아니면 중단)
2. GitHub tarball 다운로드 → 압축 해제 (`.git` 이 따라오지 않는다)
3. `env-candidates.ts` 치환 → 잔여 자리표시 검사
4. Apple Team ID 를 받았으면 `.env` 생성
5. `git init` + 초기 커밋
6. 다음 할 일 출력 — `pnpm install` · 에셋 교체 · `firebase/` · `grep -rn "TODO(앱)" src`

**실패하면 만든 디렉터리를 지운다.** 단 2번 이후 사용자가 Ctrl+C 한 경우는 남긴다
(부분 상태를 조용히 지우면 무엇이 있었는지 알 수 없다).

`pnpm install` 은 자동으로 돌리지 않는다 — 느리고 네트워크·네이티브 바이너리 실패 지점이
많아서 CLI 가 그 책임까지 지면 실패 원인이 흐려진다.

## 확정 결정

- **npm 패키지 `create-lesa-app`.** `create-my-stack` 은 이미 남이 쓰고 있다(0.5.0).
  `create-` 접두사가 있어야 `npm create lesa-app` 이 동작한다.
- **템플릿은 GitHub tarball 로 받는다** (`LESANF/react-native-template-lesa`).
  git 이 필요 없고 `.git` 히스토리도 따라오지 않는다.
- **한글 이름은 두 번 묻는다.** 자동 로마자 변환 금지(위 "질문 플로우").
- **`slug` 하나가 단일 입력.** scheme·bundleId·package 를 따로 묻지 않는다 — 개별 조정은
  생성 후 `env-candidates.ts` 한 줄이다.
- **버전은 묻지 않는다.** 전부 `0.0.1` / `1`.
- **`derive.ts` 는 순수 함수로 분리한다.** 파생 규칙이 유일하게 논리다운 부분이고 테스트가
  값싸다(입력 → 필드 표).

## 거부된 대안 (다시 제안하지 말 것)

- 한글 → ASCII 자동 로마자 변환 → 손실이 크고 `PRODUCT_NAME` 에 쓰레기가 들어간다.
- scheme·bundleId·package 를 3환경씩 개별 질문 → 최대 9개 질문. `slug` 파생으로 충분하다.
- API URL·OTA·유니버설 링크 질문 → 생성 시점에 알 수 없는 값이다(위 "묻지 않는 것").
- AST 변환·템플릿 엔진(handlebars 등) → 자리표시 문자열 치환으로 충분하고 실패가 눈에 보인다.
- `pnpm install`·`prebuild` 자동 실행 → 실패 지점이 CLI 밖인데 CLI 탓으로 보인다.
- 템플릿 레포에 CLI 를 넣기 → `ascii-cli-test` 의 ink 인트로·평가물을 살리기로 했다.
- `create-my-stack` 이름 → npm 에 이미 있다.

## 채우는 곳 (CLI 쪽 TODO)

| 어디                          | 무엇                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| npm 로그인                    | 미로그인 상태. `npm login`(2FA 포함)                               |
| `assets/lesa-appkit.asciimtn` | 822KB. `npm create` 는 실행마다 패키지를 받으므로 자를지 결정 필요 |
| GitHub tarball URL            | 레포가 private 이면 토큰이 필요하다 — 현재 상태 확인               |

## 검증 상태

- **미착수.** 이 문서는 설계만이다.
- `derive.ts` 는 순수 함수라 node 로 입력→출력 표를 검증한다.
- 전 과정은 빈 디렉터리에 실제 생성 → `pnpm install` → `check-all` 로 확인한다
  (템플릿의 clean clone 검증과 같은 게이트).
