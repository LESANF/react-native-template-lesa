# 데이터 레이어 설계 노트 (client · auth · store · react-query)

> 이 템플릿의 데이터 레이어가 제공하는 안전한 기본값과 앱별 교체 지점을 기록한다.

## 파일 지도 & 의존 방향 (단방향, 순환 없음)

```
lib/storage           MMKV 래퍼 (getItem/setItem/removeItem, JSON 직렬화) — 일반 설정과 인증 토큰 모두
   ↑
stores/auth-store     토큰 state + status. 인증의 단일 진실원
   ↑
lib/auth              refresh 오케스트레이션 (single-flight, 만료→signOut)
   ↑
lib/api/api-error     모든 실패 → ApiError 정규화 (순수 분류, 정책 없음)
   ↑
lib/api/client        axios + 인터셉터 (명시적 인증, 401→refresh→1회 재시도)
   ↑
lib/api/query-client  TanStack 설정 (retry/staleTime/gc) — 재시도 "정책"의 집

app/_layout       컴포지션 루트. 부팅 배선(hydrate 등) + 세션 출구 effect(signedIn→signedOut 전이 → 캐시 클리어 + 내비 리셋)
```

**store는 lib/api를 import하지 않는다.** 이게 순환 방지의 핵심. client·lib/auth가 store를 단방향으로 읽는다.

## 확정 결정

### client / 요청

- **단일 client 하나.** public/private client instance를 나누지 않는다. 대신 요청마다 `auth: 'none' | 'required'`를 명시하며 기본값은 `none`이다. 공개·로그인 요청에는 토큰이 붙지 않는다.
- `required`인데 access token이 없으면 네트워크를 호출하기 전에 `AUTH_REQUIRED`로 실패한다.
- facade가 `response.data`를 언래핑해 `Promise<T>`를 반환한다. `patch`, 성공 응답의 status/header가 필요한 `requestRaw`, 선택적 `parse(data: unknown)`를 제공한다.
- runtime 검증은 도메인 `requests.ts`가 endpoint별로 선택한다. 검증 라이브러리나 공통 응답 봉투는 강제하지 않는다.
- **401만 refresh 대상.** 서버가 만료를 403으로 주면 `client.ts`의 조건을 바꾼다. refresh adapter가 미구현인 동안 capability가 꺼져 있어 401이 세션을 지우지 않는다.
- **인증·재시도 가드는 `_authAttached`·`_authRetried` 문자열 프로퍼티, WeakSet 아님.** 토큰이 실제로 붙은 요청만 refresh할 수 있고 한 번만 재시도한다. axios가 재시도 시 `mergeConfig`로 config를 새 객체로 복사해 WeakSet 멤버십은 유실될 수 있지만 문자열 키 프로퍼티는 보존된다. (설치된 axios로 실증)

### 에러

- **모든 실패는 api-error가 ApiError로 정규화.** 호출부·훅은 `error.message`만 읽으면 된다. Axios request/config/response 원본은 Authorization과 body를 품을 수 있어 보관하거나 노출하지 않는다.
- **api-error엔 정책을 두지 않는다.** "무슨 일이 일어났나"(분류)만. "그래서 재시도할까"(정책)는 query-client가 판단(사실 `status`·`isNetworkError`만 읽음).

### 재시도

- **정책 = query-client의 `shouldRetryQuery`.** 기본값 보수: 네트워크·타임아웃·5xx만. 4xx·취소는 안 함. 429/408은 주석 옵트인. (쿼리=읽기에만 걸려 중복 제출 우려 없음)

### auth store

- **토큰은 state가 진실, MMKV는 재시작 복원 시드.** (JP auth-store와 같은 모양) signIn/signOut이 둘 다 쓰고, 읽기는 항상 state. hydrate는 저장값을 `isAuthTokenPair`로 검증하고 깨진 값은 지운다. fresh sign-in은 전달받은 토큰 쌍으로 세션을 완전히 교체한다.
- **user 프로필은 스토어에 안 둔다.** 서버 상태라 react-query(useQuery) 소관. (JP는 account를 스토어에 넣어 복잡해짐 — 따라하지 말 것)
- **status는 signedIn/signedOut 2개, idle 없음.** MMKV가 동기라 hydrate가 렌더 전에 끝나 idle을 관측할 구간이 없다. (토큰을 비동기 저장소로 옮기면 그때 hydrating 상태가 필요해진다.)

### 스토어 읽기 규칙 (전 스토어 공통, auth-store 헤더 주석에도 있음)

- **렌더에 쓰는 값 = 훅** `useStore((s) => s.x)` (구독 → 값 바뀌면 리렌더).
- **핸들러 / 인터셉터 / React 밖 = `getState()`** (호출 순간의 스냅샷).
- `getState()`를 렌더 본문에서 쓰면 값이 바뀌어도 화면이 안 바뀐다. 결과를 변수에 담아 `await` 너머에서 쓰지 말 것(쓰는 줄에서 다시 호출).

### refresh

- **lib/auth 별도 파일 = 순환 회피.** client가 store를 직접 부르면 store→client→store 순환. 토큰 접근을 store가 소유하고 client가 단방향 읽기로 해결.
- **refresh 요청은 반드시 raw axios/fetch.** 중앙 client로 보내면 만료 토큰이 자동 첨부되고 그 401이 다시 refresh를 기다리는 데드락.
- **미구현 refresh는 비활성.** `refresh-request.ts`에서 raw endpoint를 구현하고 capability를 함께 켜야만 자동 refresh가 시작된다.
- **single-flight.** 동시 401 여러 건이 refresh Promise 하나를 공유(`refreshInFlight` 모듈 변수). RT rotation 서버에서 중복 refresh로 인한 로그아웃 방지.
- **refresh token fallback은 refresh 경로에만 있다.** 서버가 refresh 응답에서 새 refresh token을 생략하면 `lib/auth`가 기존 값을 보존한다. fresh sign-in에는 이 fallback을 적용하지 않는다.
- **좀비 세션 가드.** refresh 시작 시점의 토큰 객체가 현재 세션과 같은지 확인한다. 도중에 로그아웃하거나 다른 계정으로 전환되면 이전 refresh의 성공·실패를 폐기해 새 세션을 덮거나 로그아웃시키지 않는다.
- **세션 종료는 확정적 자격 증명 거절만.** refresh token 누락 또는 refresh 응답의 400/401/403은 로그아웃한다. 취소·네트워크·타임아웃·429·5xx·알 수 없는 실패는 현재 세션을 보존하고 오류를 호출부로 전달한다.
- **세션 종료 후처리는 `_layout`의 세션 출구 effect 한 곳.** 인터셉터·refresh는 `signOut()`(상태 방출)까지만 하고 네비게이션을 모른다. `_layout`이 signedIn→signedOut 전이를 구독해 `queryClient.clear()` + 히스토리 리셋. 로그아웃 버튼도 `signOut()` 호출이 전부 — 수동/자동이 같은 출구로 나간다. 별도 파일이 아니라 컴포지션 루트 인라인인 이유: 부팅 배선이 모이는 자리고, 재사용될 훅이 아니다. (Firebase `onAuthStateChanged`, Amplify Hub와 같은 모양. 인터셉터에서 직접 라우팅하는 건 안티패턴이라 거부.)

### 거부된 대안 (다시 제안하지 말 것)

- `query-keys.ts` 분리 → react-query-kit의 `useXxx.getKey()`로 충분. 안 만듦.
- react-query-kit `router()` → 복잡도만 늘고 이득 없음. createQuery/createMutation 유지.
- `auth-token-store` 주입 소켓 → 순환이 사라져 불필요해짐. 삭제.
- public/private Axios instance 분리 → 요청 인증 자격은 instance 수가 아니라 `auth` 모드로 드러낸다.
- 필수 Zod/schema 계층 → 실제 계약이 필요한 endpoint에서 `parse`를 선택한다.
- api-error 봉투 타입(`ApiResponse` 등) → 서버마다 달라 미리 정하면 오해. 삭제.
- expo-router `Stack.Protected` 게이트 → 루트 Stack을 auth로 분기시키면 "라우트는 파일시스템 자동 등록" 컨벤션이 깨지고, 템플릿이 로그인 화면을 지어내 부팅을 로그인에 걸게 됨(브라우즈 우선 앱도 있어 앱 정책임). 세션 출구는 `_layout`의 명령형 리셋으로 처리.
- 세션 출구 전용 훅 파일(`use-auth-session-listener`) → 한 곳에서만 마운트되는 훅은 훅이 아니라 부팅 배선. `_layout` 인라인으로.
- `expo-secure-store`(Keychain/Keystore) 토큰 저장 → 2026-08-26 Codex 세션이 도입했다가 제거. iOS Keychain 성질(값 ~2KB 거절·앱 삭제 후 잔존·동기 삭제 없음→tombstone)이 템플릿에 결정 3개를 얹었고, 생체 인증도 없는 템플릿에 그 복잡도가 맞지 않다. 토큰은 JP처럼 MMKV. 평문 저장 리스크는 JP와 동일하게 수용하고, 필요한 앱이 그때 저장소만 교체한다(auth-store의 setItem/getItem/removeItem 3줄).

## API 레이어 컨벤션 (새 도메인)

```
api/<domain>/
  types.ts      Request/Response 타입
  requests.ts   순수 HTTP 함수 (client.get/post만 · React import 금지 · 반환 Promise<T> 명시)
  queries.ts    createQuery/createSuspenseQuery (읽기, read-only POST 포함). 키의 유일한 원천. 재사용은 getKey()
  mutations.ts  createMutation (쓰기, mutationFn까지만)
features/<feature>/hooks/   invalidate·toast·optimistic 조합 (getKey()로 키 참조)
```

`api/example/`가 시연. HTTP 메서드가 아니라 read/write 의미로 queries/mutations를 가른다.
query fetcher는 TanStack Query의 `context.signal`을 request 함수에 넘기고, request 함수는 이를 axios config에 전달한다. 일반 query와 suspense query가 같은 request 취소 계약을 공유한다.

## 스토어 컨벤션 (영속화 3방식)

- **transient(저장 안 함)**: `create()`만 → `stores/overlay`
- **특정 필드 수동 저장**: 액션 안에서 setItem/removeItem + hydrate로 복원 → `stores/auth-store`
- **전체 저장**: `create(persist(..., { storage: { getItem, setItem, removeItem } }))` → 예시 없음(현재 주석만)
- **스칼라 설정 하나면 스토어를 만들지 않는다**: `useMMKVString` 훅이 반응성까지 줘서 zustand가 낄 이유가 없다 → `lib/theme/selected-theme`

## 프로젝트가 채우는 곳 (`grep -rn "TODO(앱)" src`)

부팅·OTA·딥링크 쪽 채우는 곳은 `docs/boot.md`에 따로 있다.

- `lib/auth/refresh-request.ts` — raw refresh endpoint를 구현하고 동시에 `isAuthRefreshConfigured`를 `true`로 변경
- `lib/api/client.ts` — 만료 신호 코드(401→403 등)
- `lib/api/query-client.ts` — 재시도 정책 튜닝
- `app/_layout.tsx` — 세션 출구 리셋 목적지(`/(tabs)`)를 프로젝트 정책(홈+로그인 스택 등)으로 교체. 루트 리셋은 템플릿 기본값일 뿐 — 전역 반응이 싫으면 이 effect를 빼고 아래 구역 가드만으로 운용해도 된다
- **보호 구역 가드**: 인증 필요한 라우트 구역(마이페이지 등)이 생기면 루트가 아니라 **그 구역 `_layout`**에서 가드한다 — `useAuthStore((s) => s.status)` 구독 + signedOut이면 `<Redirect href="/login" />`. 공개 화면은 그대로 두는 브라우즈 우선 앱 대응(JP `(tabs)/account/_layout` 방식). 세션 출구 리셋(전역)과 구역 가드(국소)는 조합해서 쓴다
- **로그인**: 로그인 API 성공 후 `useAuthStore.getState().signIn(tokens)` 호출. 로그아웃은 `useAuthStore.getState().signOut()` 호출이 전부(캐시 클리어·리셋은 리스너가 처리)

## 검증 상태

- API/auth 전용 테스트 인프라는 템플릿 기본값에 넣지 않는다. lint, TypeScript, Expo Doctor, iOS export와 실제 앱 흐름으로 검증한다.
- 2026-08-31 SDK 57(RN 0.86.3) 재검증: 하네스 auth 9/9 · client 8/8 · env 13/13, check-all(tsc 6)·Doctor 18/18·iOS export 통과.
- 2026-08-26 재실행: `CI=true pnpm run check-all` 통과(frozen lockfile 포함), Expo Doctor 18/18, `expo install --check` up to date, development iOS `expo export` 통과.
- **사용자 확인 대기**: 새 시뮬레이터를 띄우지 않는다. 기존 시뮬레이터에서 `/api-example` 확인만 요청한다.
- 스크래치 하네스(커밋 안 함): lib/auth 오케스트레이션 9/9 · client 레이어 8/8(로컬 에코 서버, 외부 호출 0) · env 체계 13/13 · import 방향 정적 확인. 예제 API 자체는 검증 대상이 아니다.
- **2026-09-07 코드 감사** — 위 "확정 결정"의 주장을 코드·라이브러리로 대조했다. **전부 사실, 수정 없음**:
  `_authAttached` 문자열 프로퍼티가 axios 1.20.0 `mergeConfig` 를 견디고 WeakSet 은 유실됨을 실측 ·
  `required` + 토큰 없음 → 네트워크 전 `AUTH_REQUIRED` throw · `isRefreshableError` 는
  capability off 면 즉시 false(401 이 세션을 지우지 않는다) · refresh single-flight(`refreshInFlight`
  공유 + finally 해제) · 좀비 세션 가드(`getState().token === sessionToken` identity 비교) ·
  재시도 정책(canceled 제외, isNetworkError 또는 5xx 만) · refresh 호출부가 try/catch 로 감싸
  unhandled rejection 없음.
  이 레이어는 KR 이식이 아니라 템플릿 자체 설계다(KR 은 `lib/auth` 가 없고 `interceptors.ts`·
  `cookie.ts` 구조) — 그래서 KR diff 대신 주장 대조로 검증했다.
- **의도적 미검증**: 실제 backend refresh. endpoint/응답 계약은 앱이 채워야 한다.

## 인터셉터 확장 (공통 헤더·로깅·점검모드 등)

전부 `lib/api/client.ts`에 `axiosClient.interceptors.*.use(...)` 블록을 추가한다. `axiosClient`를 export하지 않는 건 의도 — export하면 앱 곳곳에서 인터셉터를 붙이는 두 번째 경로가 생긴다. 인터셉터의 집은 이 파일 하나다.
