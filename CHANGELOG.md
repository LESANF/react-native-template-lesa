# Changelog

버전은 `package.json` 과 `env-candidates.ts` `version.app` 두 곳에 있다.
전자는 템플릿 자체 버전, 후자는 **생성된 앱의** 버전이다(받는 쪽이 바꾼다).

릴리즈 절차는 [docs/config.md](docs/config.md) "릴리즈" 참고.

## 0.0.1 (2026-09-07) — 테스트 배포

> 아직 나만 쓰는 단계다. `1.0.0` 은 clean clone 검증과 CLI(C5)가 끝난 뒤에 단다.
> 이전에 `v0.1.0` 태그를 "템플릿 기반(foundation)"으로 붙였는데, 그때는 버전 체계를
> 정하기 전이었다. 여기서부터 0.0.x 로 다시 센다.

**부팅 파이프라인** — splash 뒤 프리로더(강제 업데이트 · OTA · 권한 슬롯) + 프리페치.
KR `lib/preloader` verbatim 이식(대조 검증: `boot.md`).

**딥링크** — 파서 · 매처 · 큐 · 게이트 인프라 · 안전 탈출 계보(KR). 어트리뷰션 SDK 는
`lib/deep-link/attribution.ts` 하나로 붙이고 뗀다.

**푸시** — FCM(RNFB 26.3.3) + notify-kit. 백그라운드/종료는 OS 가 표시하고 탭은 RNFB 로
오는 KR 정책. 포그라운드 표시는 `SHOW_FOREGROUND_NOTIFICATION` 스위치.
활성화는 `firebase/` 파일 존재로 갈린다.

**OTA** — hot-updater(자체 서버). `Env.urls.ota` 가 비면 비활성.

**전역 오버레이** — `popup.confirm()` Promise 표면 · dev 네트워크 로거 FAB.

**툴링** — pnpm hoisted 링커 · prettier · 표시명 분리(`displayName`) · EAS 는 파일 존재로
갈리는 opt-in · 테스트 인프라 미포함.

### 고친 것 (참조 앱 대조에서 발견)

- `ios:release` 가 `--configuration release`(소문자)라 release 빌드에 dev 번들이 들어갔다.
  `runIosAsync.js` 가 `=== 'Release'` 정확 비교를 한다.
- `prebuild` 의 `rm -rf ios android` 접두 → `EXPO_NO_GIT_STATUS=1`. `-p` 와 함께 쓰면
  다른 플랫폼이 지워지고 재생성되지 않았다.
- 루트 `unstable_settings.anchor` 복원 — 없으면 expo-router 가 자식 정렬·딥링크 랭킹에서
  splash 가 첫 화면임을 모른다.
- 딥링크 in-flight 중복 창 · `makeKey` 키 충돌 · `external-web` 쿼리 인코딩 · 탭 이름 무검증.
- 푸시 토큰 동기화에 KR 의 in-flight 단일화와 fetch 후 auth 재확인 이식.

### 문서

섹션별 6개 문서로 재편(`AGENTS.md` 가 폴더→문서 색인). 각 문서는 파일 지도 · 확정 결정 ·
거부된 대안 · 채우는 곳 · 검증 상태 순서다.
