# create-lesa-app — 프로젝트 생성 CLI

`npm create lesa-app <dir>` 로 이 템플릿에서 새 프로젝트를 만든다.
CLI 코드는 이 레포가 아니라 `future/ascii-cli-test`(→ `create-lesa-app`)에 있고,
**치환 대상은 이 문서가 단일 출처다** — 템플릿 필드가 바뀌면 여기와 CLI 를 같이 고친다.

## 파일 지도

```
create-lesa-app/                     (`future/ascii-cli-test` 를 살림. 지금은 npm 미발행)
  lesa-appkit-intro.tsx              .asciimtn 파서 + ink 렌더 (아직 배선 안 함)
  src/derive.ts                      slug → 전 필드 파생 (순수 함수, 테스트 대상)
  src/apply.ts                       env-candidates.ts 치환 · .env 생성
  src/copy.ts                        `git ls-files` 로 추적 파일만 복사 (배포 방식이 바뀌면 이 파일만 교체)
  src/create.ts                      오케스트레이션 + 실패 시 cleanup (UI 없이 테스트 가능)
  src/index.tsx                      진입점 — 인자 파싱 + ink render
  src/ui.tsx                         프롬프트(ink). preview.js 의 팔레트·StepRail 재사용
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
- `create-my-stack` 이름 → npm 에 이미 있다(0.5.0).
- **레포를 public 으로 바꿔 tarball 받기 → 거부(2026-09-07).** `docs/` 가 참조 앱
  (`참조 앱 KR`·`참조 앱 JP`)의 **결함 목록 D1~D19** 와 OTA 서버 아키텍처
  (`자체 OTA 서버`: 자체 서버), 로컬 절대 경로를 담고 있다. 시크릿은 없지만 사내
  프로덕션 앱의 약점은 공개할 성질이 아니다. 공개하려면 `docs/` 를 먼저 일반화해야 한다.
- private npm 패키지($7/월) → 지금은 로컬 복사로 충분하다.

## 채우는 곳 (CLI 쪽 TODO)

| 어디                          | 무엇                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| 템플릿 폴더 경로              | 지금은 인자나 상대 경로로 받는다. 배포 방식이 정해지면 `copy.ts` 를 교체  |
| `assets/lesa-appkit.asciimtn` | 822KB. 로컬 복사 방식에선 문제없지만 npm 발행 시 자를지 결정 필요         |
| 배포 방식                     | 템플릿 완성 후 결정 — public + tarball(docs 일반화 선행) 또는 private npm |

## 검증 상태 (2026-09-07 구현·검증)

**통과:**

| 무엇                     | 결과                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateSlug` 12케이스  | `workout`·`my-app`·`a`·`app2` 통과 / 한글·대문자·숫자시작·공백·언더스코어·빈값·하이픈끝·하이픈시작 거부                                         |
| `derive` 파생            | scheme·bundleId 3환경 · `package === bundleId` · 영문 시 `displayName=''`                                                                       |
| 치환(실제 템플릿 파일)   | identity 전부 · `urls`·`version` 미변경 · 잔여 자리표시 0                                                                                       |
| 잔여 자리표시 가드       | 자리표시를 바꾼 템플릿에서 `ApplyError` + **줄번호까지** 출력                                                                                   |
| 복사                     | 33개 → **30개**. gitignore 대상 11종 전부 제외, 필수 파일·중첩 구조 보존                                                                        |
| 복사 가드                | 템플릿 아닌 폴더 거부 · 비어있지 않은 대상 거부 · git 레포 아님 거부                                                                            |
| 실패 시 cleanup          | 치환 실패 시 대상 디렉터리 삭제 확인                                                                                                            |
| 생성 프로젝트            | `git` 초기 커밋(216파일) · frozen install · **`check-all` green**                                                                               |
| `.env`                   | Team ID 가 `postinstall` 에 덮이지 않고 `expo lint` 가 실제로 export                                                                            |
| **한글 이름 → 네이티브** | `CFBundleDisplayName`=`워크아웃` · `strings.xml app_name`=`워크아웃` · `rootProject.name`=`workout` · `applicationId`=`com.workout.development` |
| 인자 검증                | 대상·템플릿 경로 누락 시 사용법 출력                                                                                                            |
| `tsc --noEmit`           | 통과(`@types/node` + tsconfig 추가)                                                                                                             |

**미검증 — 사용자 몫:**

- **대화형 UI 조작.** `useInput` 이 raw mode 를 요구해 TTY 가 아닌 환경에서는 렌더 자체가
  안 된다. 실제 화면·키 입력(↑↓/jk·Enter·Esc·백스페이스)은 터미널에서 확인해야 한다.
- 인트로 애니메이션(`lesa-appkit-intro.tsx`)은 아직 배선하지 않았다.
- 생성된 프로젝트의 실기 빌드·실행.

**실행 방법 (지금):**

```bash
cd ~/Desktop/Repo/future/ascii-cli-test
pnpm start ../my-new-app --template ~/Desktop/Repo/lesa-expo-template
# 또는 LESA_TEMPLATE_DIR=~/Desktop/Repo/lesa-expo-template pnpm start ../my-new-app
```

스크립트 이름은 `start` 다 — `create` 로 두면 **pnpm 내장 `pnpm create`**(npm 에서
`create-*` 패키지를 받아 실행)와 충돌해서 인자를 패키지 이름으로 해석한다(실측 확인).
npm 발행 후에는 `bin` 이 등록돼 `npx create-lesa-app <dir>` 로 쓴다.
