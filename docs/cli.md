# create-lesa-app — 프로젝트 생성 CLI

이 템플릿에서 새 프로젝트를 만든다(실행 방법은 맨 아래 "실행 방법").
CLI 코드는 이 레포가 아니라 **형제 레포 `../create-lesa-app`** 에 있고,
**치환 대상은 이 문서가 단일 출처다** — 템플릿 필드가 바뀌면 여기와 CLI 를 같이 고친다.

## 파일 지도

```
create-lesa-app/                     (`~/Desktop/Repo/create-lesa-app`. 지금은 npm 미발행)
  src/derive.ts                      slug → 전 필드 파생 (순수 함수, 테스트 대상)
  src/flow.ts                        프롬프트 스텝 머신 (순수 함수 — TTY 없이 테스트한다)
  src/apply.ts                       env-candidates.ts 치환 · .env 생성
  src/copy.ts                        `git ls-files` 로 추적 파일만 복사 (배포 방식이 바뀌면 이 파일만 교체)
  src/create.ts                      오케스트레이션 + 실패 시 cleanup (UI 없이 테스트 가능)
  bin/create-lesa-app.mjs            tsx 로더 등록 — node 는 `.tsx` 를 직접 못 돌린다
  src/index.tsx                      진입점 — 인자 파싱 + 템플릿 탐색 + ink render
  src/ui.tsx                         프롬프트(ink). preview.js 의 팔레트·StepRail 재사용
  src/intro.tsx                      ASCII 워드마크 — 1회 재생 후 마지막 프레임에 정지
  src/flow.test.mjs                  스텝 머신·파생 회귀 테스트 (`pnpm test`)
  src/assets/intro.json              구운 인트로 프레임 (56KB)
  scripts/bake-intro.mjs             .asciimtn(822KB) → intro.json (`pnpm bake-intro`)
  assets/lesa-appkit.asciimtn        인트로 원본 (ascii-motion 프로젝트 파일)
```

## 질문 플로우

```
[인트로 ASCII 워드마크 — 1회 재생 후 배너로 정지]

◆ 01 NAME  ──  ○ 02 SLUG|LABEL  ──  ○ 03 TEAM  ──  ○ 04 READY

? App name         레사앱 | lesa-app        ← 언어 무관
    ├─ 비ASCII → 그게 홈 화면 이름.  ? Slug              lesa-app
    └─ ASCII   → 그게 slug.          ? Home screen name  lesa-app  (선택)
? Apple Team ID  (선택 · iOS 전용 · Enter 로 건너뛰기)

04 READY 에서 파생 결과(scheme·bundleId·package·version)를 보여주고 Enter 로 생성한다.
```

**질문 3개(양쪽 경로 동일).** 언어를 고르게 하지 않는다 — 이름이 `^[a-z][a-z0-9-]*$` 를 통과하면 그게
곧 slug 이고, 아니면 slug 을 한 번 더 묻는다(선택 질문 하나가 줄고 분기가 값에서 나온다).
한글에서 ASCII 를 자동 변환하지 않는다 — 로마자 변환은 손실이 크고 (`레사앱` →
`lesaaeb`), 이 값이 Xcode 프로젝트명·스킴·`PRODUCT_NAME` 이 된다.

**사용자에게 보이는 문구는 영어다.** 코드 주석·이 문서는 한국어를 유지한다.

## 파생 규칙

`slug` 하나에서 전부 나온다. production 은 접미사가 없다(템플릿 자리표시와 같은 컨벤션).

| 필드                         | development                                          | preview               | production    |
| ---------------------------- | ---------------------------------------------------- | --------------------- | ------------- |
| `identity.name`              | `<slug>` (전 환경 공통)                              |                       |               |
| `identity.displayName`       | 비ASCII 면 이름, ASCII 면 따로 받은 값(생략 시 `''`) |                       |               |
| `identity.slug`              | `<slug>`                                             |                       |               |
| `identity.scheme`            | `<slug>-dev`                                         | `<slug>-preview`      | `<slug>`      |
| `identity.bundleId`          | `com.<slug*>.development`                            | `com.<slug*>.preview` | `com.<slug*>` |
| `identity.package`           | bundleId 와 동일                                     |                       |               |
| `version.app`                | `0.0.1`                                              | `0.0.1`               | `0.0.1`       |
| `version.iosBuildNumber`     | `1`                                                  | `1`                   | `1`           |
| `version.androidVersionCode` | `1`                                                  | `1`                   | `1`           |

`<slug*>` = **하이픈을 제거한 slug**. `android.package` 는 "문자·숫자·밑줄만, 점으로 구분"
이라 하이픈을 못 쓴다(SDK 57 app config 문서 확인). iOS bundleId 는 허용하지만 둘을 같게
두려고 같은 값을 쓴다 — `lesa-app` → `com.lesaapp.development`. `scheme` 은 패턴이
`^[a-z][a-z0-9+.-]*$` 라 하이픈을 그대로 둔다(`lesa-app-dev`).

`slug` 검증: `^[a-z][a-z0-9-]*$`. 대문자·공백·한글은 거부하고 다시 묻는다.
Xcode 프로젝트명은 `sanitizedName()` 이 non-word 를 지우므로 ASCII 가 아니면 `app` 이 된다
(사유 `config.md` "표시명").

## 묻지 않는 것

|                         | 왜                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `urls.api`              | 프로젝트 서버가 정해질 때 채운다. production 은 `.invalid` 로 남아 부팅 throw 가 안전장치다 |
| `urls.ota`              | 빈 값 = OTA 비활성. 자체 서버가 생기면 채운다                                               |
| 안드로이드 서명         | release 는 keystore **파일** + Gradle 환경변수다(`with-android-plugin.ts`). debug 는 불필요 |
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
2. 로컬 템플릿 폴더 복사 — **복사 대상 = `git ls-files`**. 제외 목록을 손으로 들면 템플릿에
   새 gitignore 항목이 생길 때마다 놓친다(실제로 `.pnpm-store`·`expo-env.d.ts`·`npmlogin.log`
   를 놓쳤다). git 추적 파일은 산출물·로컬 상태를 정의상 제외한다.
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
- **템플릿은 로컬 폴더에서 복사한다.** 레포가 **private** 이라(확인함) tarball 은 토큰이
  필요하고, `npm create` 를 쓰는 사람이 토큰을 가질 수 없다. 지금 목적은 "만들어서 써보기"라
  로컬 복사로 충분하다 — 배포 방식은 템플릿이 완성된 뒤 결정하고 `copy.ts` 하나만 교체한다.
  `.git` 은 복사하지 않는다.
- **npm 에 발행하지 않는다(지금).** 로컬에서 `pnpm link` 또는 `npx .` 으로 쓴다.
  패키지명 `create-lesa-app` 은 선점만 해둔 상태(npm 로그인 `lesanf` 확인).
- **언어 선택 질문을 두지 않는다(2026-09-08).** 이름이 slug 패턴을 통과하는지로 분기한다.
  선택 질문은 사용자가 답을 알아야 하지만, 이 분기는 입력값에서 나온다.
- **한글 이름은 두 번 묻는다.** 자동 로마자 변환 금지(위 "질문 플로우").
- **스텝 전이는 `flow.ts` 순수 함수.** `useInput` 안에 있으면 TTY 없이는 한 줄도 검증할 수
  없다 — 실제로 slug 스텝이 정말 뜨는지 확인이 불가능했다. UI 는 그리기만 한다.
- **인트로 프레임을 미리 굽는다.** 822KB JSON 을 런타임에 파싱하고 셀마다 `<Text>` 를 만들면
  ink 노드가 1020 개다. 행별 색 런으로 접어 56KB · 프레임당 ~262 노드
  (`scripts/bake-intro.mjs`, 재실행으로 재생성 가능).
- **`slug` 하나가 단일 입력.** scheme·bundleId·package 를 따로 묻지 않는다 — 개별 조정은
  생성 후 `env-candidates.ts` 한 줄이다.
- **버전은 묻지 않는다.** 전부 `0.0.1` / `1`.
- **`derive.ts` 는 순수 함수로 분리한다.** 파생 규칙이 유일하게 논리다운 부분이고 테스트가
  값싸다(입력 → 필드 표).
- **홈 화면 이름을 ASCII 경로에서 받는다(2026-09-08).** `displayName` 이 비면 템플릿이
  `name` 을 그대로 쓴다(`app.config.ts` 의 `CFBundleDisplayName` · `with-android-plugin.ts`
  의 `app_name`). ASCII 경로는 항상 비어서 `lesa-app` 가 홈 화면에 그대로 떴고 대소문자·공백을
  줄 방법이 없었다. 선택 질문이라 생략하면 종전과 같다.
- **Apple Team ID 는 iOS 전용이라고 힌트에 쓴다.** 안드로이드는 물어볼 게 없다(위 표).
- **인트로는 무한 루프.** 프레임 state 를 `Intro` 가 들고 있어 형제인 프롬프트는 리렌더되지
  않는다 — 입력 커서에 영향이 없다.
- **`bin` 은 tsx 로더를 등록하는 래퍼다(2026-09-08).** node 는 `.tsx` 를 직접 실행할 수
  없어(`ERR_UNKNOWN_FILE_EXTENSION`) `bin` 이 `src/index.tsx` 를 가리키면 바로 죽는다.
  빌드 단계를 두는 대신 4줄 래퍼를 둔다 — 그래서 `tsx` 가 dependency 다.
- **템플릿 경로는 형제 폴더가 기본값이다.** `env-candidates.ts`·`app.config.ts` 가 있으면
  템플릿으로 본다. 매번 `--template` 을 넘기게 하면 실제로 아무도 안 쓴다.

## 거부된 대안 (다시 제안하지 말 것)

- 한글 → ASCII 자동 로마자 변환 → 손실이 크고 `PRODUCT_NAME` 에 쓰레기가 들어간다.
- scheme·bundleId·package 를 3환경씩 개별 질문 → 최대 9개 질문. `slug` 파생으로 충분하다.
- API URL·OTA·유니버설 링크 질문 → 생성 시점에 알 수 없는 값이다(위 "묻지 않는 것").
- AST 변환·템플릿 엔진(handlebars 등) → 자리표시 문자열 치환으로 충분하고 실패가 눈에 보인다.
- `pnpm install`·`prebuild` 자동 실행 → 실패 지점이 CLI 밖인데 CLI 탓으로 보인다.
- 템플릿 레포에 CLI 를 넣기 → 별 레포로 둔다. 치환 계약만 이 문서가 갖는다.
- `future/ascii-cli-test` 유지 → **거부(2026-09-08).** ASCII 낙서용 폴더였고 git 레포도
  아니었다. 최종 산출물이 CLI 로 확정됐으니 `../create-lesa-app` 으로 승격하고 git 을 얹었다.
  평가물(ascii-motion·pikachu·preview 변주 5종·clack·gum, 약 1.7MB)과 안 쓰는 의존성
  (`sharp`·`@clack/prompts`)은 제거했다.
- `create-my-stack` 이름 → npm 에 이미 있다(0.5.0).
- **레포를 public 으로 바꿔 tarball 받기 → 거부(2026-09-07).** `docs/` 가 참조 앱
  (`참조 앱 KR`·`참조 앱 JP`)의 **결함 목록 D1~D19** 와 OTA 서버 아키텍처
  (`자체 OTA 서버`: 자체 서버), 로컬 절대 경로를 담고 있다. 시크릿은 없지만 사내
  프로덕션 앱의 약점은 공개할 성질이 아니다. 공개하려면 `docs/` 를 먼저 일반화해야 한다.
- private npm 패키지($7/월) → 지금은 로컬 복사로 충분하다.
- **한글/영문 선택 질문 → 거부(2026-09-08).** 값에서 판별할 수 있는 것을 사람에게 묻는다.
- `bin` 을 `.tsx` 로 직접 지정 → node 가 확장자를 몰라 죽는다(실측).
- 빌드 산출물(dist) 도입 → 로더 등록 4줄로 충분하다.
- `.asciimtn` 을 런타임에 파싱 → 822KB · ink 노드 1020 개.

## 채우는 곳 (CLI 쪽 TODO)

| 어디                          | 무엇                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| 템플릿 폴더 경로              | 지금은 인자나 상대 경로로 받는다. 배포 방식이 정해지면 `copy.ts` 를 교체  |
| `types: ["node"]` (tsconfig)  | `node:*` 내장 모듈 타입에 필요하다. 빼면 `tsc` 가 깨진다(실측)            |
| `assets/lesa-appkit.asciimtn` | 822KB 원본. 발행 시엔 `src/assets/intro.json`(56KB)만 있으면 되므로 제외  |
| 배포 방식                     | 템플릿 완성 후 결정 — public + tarball(docs 일반화 선행) 또는 private npm |

## 검증 상태 (2026-09-07 구현·검증)

**통과:**

| 무엇                     | 결과                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateSlug` 12케이스  | `lesa-app`·`lesa-app`·`a`·`app2` 통과 / 한글·대문자·숫자시작·공백·언더스코어·빈값·하이픈끝·하이픈시작 거부                                   |
| `derive` 파생            | scheme·bundleId 3환경 · `package === bundleId` · 영문 시 `displayName=''`                                                                    |
| 치환(실제 템플릿 파일)   | identity 전부 · `urls`·`version` 미변경 · 잔여 자리표시 0                                                                                    |
| 잔여 자리표시 가드       | 자리표시를 바꾼 템플릿에서 `ApplyError` + **줄번호까지** 출력                                                                                |
| 복사                     | 33개 → **30개**. gitignore 대상 11종 전부 제외, 필수 파일·중첩 구조 보존                                                                     |
| 복사 가드                | 템플릿 아닌 폴더 거부 · 비어있지 않은 대상 거부 · git 레포 아님 거부                                                                         |
| 실패 시 cleanup          | 치환 실패 시 대상 디렉터리 삭제 확인                                                                                                         |
| 생성 프로젝트            | `git` 초기 커밋(216파일) · frozen install · **`check-all` green**                                                                            |
| `.env`                   | Team ID 가 `postinstall` 에 덮이지 않고 `expo lint` 가 실제로 export                                                                         |
| **한글 이름 → 네이티브** | `CFBundleDisplayName`=`레사앱` · `strings.xml app_name`=`레사앱` · `rootProject.name`=`lesa-app` · `applicationId`=`com.lesaapp.development` |
| 인자 검증                | 대상·템플릿 경로 누락 시 사용법 출력                                                                                                         |
| `tsc --noEmit`           | 통과(`@types/node` + tsconfig 추가)                                                                                                          |

**2026-09-08 추가 검증** (`pnpm test` + pty 로 실제 CLI 를 구동):

| 무엇               | 결과                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 스텝 머신 7군      | ASCII 이름은 slug 스킵 · 비ASCII 는 slug 필수 · 빈값/공백 거부 · 잘못된 slug 6종 재질문 · 이름을 비ASCII 로 고치면 slug 재질문 · trim |
| 인트로 렌더        | pty 로 워드마크 출력 확인, 1회 재생 후 정지                                                                                           |
| 전 구간 구동(한글) | `레사앱`+`lesa-app`+TeamID → 216파일 커밋 · `displayName='레사앱'` · `.env` Team ID                                                   |
| 전 구간 구동(영문) | `lesa-app` → slug 스텝 건너뜀 · Team ID 생략 시 "Xcode automatic signing"                                                             |
| 파일 수 일치       | 생성 216 = 템플릿 `git ls-files` 216                                                                                                  |

**고친 결함(같은 구동에서 발견):**

- **하이픈 slug 이 잘못된 Android package 를 만들었다.** `lesa-app` → `com.lesa-app.development`.
  `android.package` 는 하이픈을 못 쓴다(문서 확인). 리버스 도메인에서만 하이픈을 제거한다.
- **줄바꿈이 섞인 붙여넣기가 값에 `\r` 로 들어갔다.** ink 는 `input === '\r'` 일 때만
  `key.return` 을 세우므로 `'lesa-app\r'` 한 덩어리는 전부 텍스트가 된다. 제어문자를 걷어내고
  줄바꿈이 있었으면 Enter 로 본다.
- READY 요약의 라벨 열 폭이 11 이라 `displayName레사앱` 으로 붙었다 → 13.

**2026-09-08 연결 검증:**

| 무엇                 | 결과                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `bin` 실행           | 래퍼 없이는 `ERR_UNKNOWN_FILE_EXTENSION` — 래퍼 추가 후 정상         |
| `npm link`           | nvm bin 이 이미 PATH 에 있어 셸 프로필 수정 없이 등록                |
| 임의 cwd · 인자 없음 | `create-lesa-app 레사앱` → 형제 템플릿 자동 탐색 → 216파일 초기 커밋 |
| 한글 디렉터리명      | `레사앱` 으로 생성됨(디렉터리명은 `name` 과 무관)                    |
| tarball 독립 실행    | 원본 `.asciimtn` 없이 워드마크 렌더 + 생성 완료 (풀어서 구동)        |

**미검증 — 사용자 몫:**

- **터미널 한글 IME 조립 중간 상태.** pty 로는 조합 완료 문자만 보낼 수 있어 ink 가 조립
  중간 상태를 어떻게 받는지 재현할 수 없다. 실기에서 직접 쳐봐야 한다.
- 생성된 프로젝트의 실기 빌드·실행.

**실행 방법 (지금):**

```bash
cd ~/Desktop/Repo/create-lesa-app
pnpm install && npm link      # 최초 1회 — PATH 에 create-lesa-app 등록

create-lesa-app my-new-app    # 아무 디렉터리에서
```

템플릿은 `--template <path>` → `LESA_TEMPLATE_DIR` → **형제 `../lesa-expo-template`**
순으로 찾는다. 두 레포가 형제면 인자가 필요없다.

`npm link` 는 nvm 의 현재 node 버전에 묶인다 — node 를 갈아타면 다시 걸어야 한다.
연결 없이 쓰려면 레포 안에서 `pnpm start ../my-new-app`.

스크립트 이름은 `start` 다 — `create` 로 두면 **pnpm 내장 `pnpm create`**(npm 에서
`create-*` 패키지를 받아 실행)와 충돌해서 인자를 패키지 이름으로 해석한다(실측 확인).
npm 발행 후에는 `bin` 이 등록돼 `npx create-lesa-app <dir>` 로 쓴다.
