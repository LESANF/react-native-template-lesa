# Design Decisions

Direction-level decisions agreed during template design discussions.
Each section records: the decision, the reasoning, and what is deferred.

각 결정의 **본문은 섹션 문서로 옮겼다** — 여기는 "언제·무엇을 정했는지"의 색인이다.
섹션을 수정하기 전에 해당 문서를 읽어라(`AGENTS.md` 가 폴더→문서를 매핑한다).

| 날짜       | 결정                                                               | 본문                     |
| ---------- | ------------------------------------------------------------------ | ------------------------ |
| 2026-06-10 | 환경 설정 — `defineEnv`, 루트 flat 파일, 시크릿 정책               | [config.md](config.md)   |
| 2026-06-10 | 스타일링 1차 — 2026-06-16 에 Uniwind 로 대체됨(폐기)               | —                        |
| 2026-06-11 | 폴더 구조·라우팅 — zone, 단방향 import, `app/` 규칙, 에러 처리     | [routing.md](routing.md) |
| 2026-06-11 | 배럴 정책 · 컴포넌트 승격(Rule of Three)                           | [ui.md](ui.md)           |
| 2026-06-16 | 스타일링 — Uniwind + 3계층 토큰, CSS `@theme` 단일 출처            | [ui.md](ui.md)           |
| 2026-06-17 | 앱 셸 — `providers/` 역할 분리, `(tabs)` 규약, 모달 전략           | [routing.md](routing.md) |
| 2026-06-17 | 스타트업 2층 — 동기 모듈 로드 / 비동기 프리로더                    | [boot.md](boot.md)       |
| 2026-08-24 | 데이터 레이어 — 아래 절 + [data-layer.md](data-layer.md)           | 아래                     |
| 2026-09-03 | Config plugins — KR/JP `app.config` 이식 매핑표                    | [config.md](config.md)   |
| 2026-09-03 | 푸시 스택 — RNFB 26 · notify-kit · 권한                            | [push.md](push.md)       |
| 2026-09-04 | 딥링크 — KR 메커니즘 이식, 안전 탈출 계보                          | [boot.md](boot.md)       |
| 2026-09-07 | 표시명 — `name` 은 ASCII, 홈 화면은 `displayName`                  | [config.md](config.md)   |
| 2026-09-07 | EAS — 열어만 둔다(파일 존재로 갈림)                                | [config.md](config.md)   |
| 2026-09-07 | prebuild clean · iOS configuration 대소문자                        | [config.md](config.md)   |
| 2026-09-07 | anchor — `unstable_settings` 는 Stack prop 과 같은 값              | [routing.md](routing.md) |
| 2026-09-07 | 어트리뷰션 SDK — 선택, 뗐다 붙였다                                 | [boot.md](boot.md)       |
| 2026-09-07 | 푸시 표시 정책 — KR 방식(백그라운드/종료는 OS)                     | [push.md](push.md)       |
| 2026-09-07 | CLI `create-lesa-app` — slug 하나에서 전 필드 파생                 | [cli.md](cli.md)         |
| 2026-09-08 | CLI — 언어 선택 폐기, 이름이 slug 패턴이면 재사용                  | [cli.md](cli.md)         |
| 2026-09-08 | Android package 는 하이픈 불가 — 리버스 도메인에서만 제거          | [cli.md](cli.md)         |
| 2026-09-10 | safe area — 네이티브 SafeAreaView 대신 `InsetView`(View 스타일)    | [ui.md](ui.md)           |
| 2026-09-17 | iOS NSE — KR 타깃 포함, `targets/` 존재로 갈림, apple-targets 패치 | [push.md](push.md)       |

## Data Layer — current template (updated 2026-08-24)

상세한 설계 근거와 프로젝트별 교체 지점은 [data-layer.md](data-layer.md)를
단일 기준으로 삼는다. 이 절은 현재 구조만 요약한다.

### Structure

```
src/api/<domain>/
  types.ts       Request/Response/Variables 타입
  requests.ts    순수 HTTP 함수
  queries.ts     react-query-kit query 선언
  mutations.ts   react-query-kit mutation 선언

src/lib/api/
  client.ts      단일 axios instance + 외부 client facade
  api-error.ts   전송 실패를 ApiError로 정규화
  query-client.ts
  query-provider.tsx
  react-query-native-listeners.ts

src/lib/auth/
  index.ts             single-flight refresh 오케스트레이션
  refresh-request.ts   앱이 실제 refresh endpoint를 채우는 raw HTTP seam

src/stores/auth-store.ts
  인증 state의 단일 진실원 + MMKV 복원
```

인증 토큰과 일반 설정 모두 MMKV에 둔다(JP와 동일). hydrate는 저장값을 검증하고 깨진
값은 지운다. MMKV가 동기라 렌더 전에 `signedIn | signedOut` 두 상태로 복원되며
hydrating 상태는 두지 않는다. expo-secure-store는 2026-08-26 검토 후 미채택 — 사유는
data-layer.md 거부된 대안.

의존 방향은 `storage → auth-store → lib/auth → client` 단방향이다.
store는 client를 import하지 않으며, 중앙 client의 raw axios instance는 외부에
노출하지 않는다.

### API declarations

- `requests.ts`는 React/TanStack Query를 import하지 않는 순수 HTTP 함수만 둔다.
  query fetcher는 TanStack Query가 주는 `AbortSignal`을 request와 axios까지 전달한다.
- 읽기는 `createQuery`/`createSuspenseQuery`, 쓰기는 `createMutation`으로 선언한다.
  read-only POST도 query에 속한다.
- query key는 factory 선언 안에 한 번만 둔다. 재사용은
  `useXxxQuery.getKey(variables)`로 하고 별도 `query-keys.ts`는 만들지 않는다.
- mutation API 선언은 `mutationFn`까지만 담당한다. invalidate, toast, optimistic
  update 같은 제품 UX는 feature hook에서 조합한다.
- API barrel은 만들지 않는다. `requests|queries|mutations|types` 파일을 직접 import하며
  ESLint가 이 경계를 검사한다.

### Client and auth

- client는 응답의 `data`를 unwrap하므로 request 함수 반환 타입은 `Promise<T>`다.
  `patch`, 성공 응답용 `requestRaw`, endpoint별 선택적 `parse(data: unknown)`도 제공한다.
- 요청 인증은 `auth: 'none' | 'required'`이며 기본값은 `none`이다. `required`만
  요청 시점의 auth-store에서 access token을 읽어 Bearer 헤더를 붙이고, 토큰이
  없으면 네트워크 전에 실패한다.
- 토큰이 실제로 붙었던 요청의 401만 single-flight refresh 후 한 번 재시도한다.
  config의 문자열 마커가 인증 자격과 재시도 횟수를 보존한다.
- refresh adapter가 스텁인 동안 capability는 꺼져 있다. 구현 후 명시적으로 켠다.
- refresh token 누락이나 refresh의 400/401/403만 세션을 끝낸다. 네트워크,
  timeout, 429, 5xx, 취소, 알 수 없는 실패는 세션을 보존한다.
- `ApiError`는 status/code/message/network 여부만 보존하고 Authorization이나 body를
  품을 수 있는 Axios 원본은 노출하지 않는다.
- fresh sign-in은 전달받은 토큰 쌍으로 세션을 완전히 교체한다. refresh 응답이 새
  refresh token을 생략했을 때만 refresh 오케스트레이션이 기존 값을 보존한다.
- refresh HTTP 호출은 중앙 client를 거치지 않는다. 만료 토큰 첨부와 refresh 재진입을
  피하기 위해 raw axios/fetch를 사용한다.
- refresh 도중 로그아웃이나 계정 전환이 일어나면 시작 시점 세션과 비교해 오래된
  성공/실패 결과를 폐기한다.
- 세션 종료 후처리는 `app/_layout.tsx`의 세션 출구 effect 한 곳이다. signedIn→signedOut
  전이를 구독해 `queryClient.clear()`와 내비게이션 리셋을 수행하며, 인터셉터·refresh는
  `signOut()` 상태 방출까지만 한다. 보호 구역은 해당 구역 `_layout`의 `<Redirect>`로 가드한다.

### Deliberately app-owned

템플릿은 실제 refresh endpoint와 응답 shape, 만료 status(기본 401), query retry 정책,
인증 종료 후 reset route를 결정하지 않는다. JSONPlaceholder는 development/preview
시연 전용이며 production의 `.invalid` API 후보는 설정 전 무조건 실패한다. 각 위치의
`TODO(앱)`을 제품 계약에 맞게 채운다.
