<p align="center">
  <img src="./assets/images/profile.jpg" alt="lesa-expo-template" width="180" />
</p>

<h1 align="center">lesa-expo-template</h1>

<p align="center">
  나만의 의견이 담긴 <b>Expo SDK 57</b> 스타터 — pnpm · CNG-first · 검증된 패턴만.
</p>

---

> 🚧 개발 중. 실무에서 반복해서 쓰던 패턴을 모은 개인 템플릿입니다.
>
> 현재 상태와 남은 작업은 [`docs/template-completion.md`](./docs/template-completion.md)를 기준으로 관리합니다.

## What's inside

- **Expo SDK 57** · pnpm · CNG-first (no committed `ios`/`android`)
- **expo-router** 파일 기반 라우팅 + **NativeTabs** (iOS 26 liquid glass)
- **Uniwind**(무료) + 3계층 디자인 토큰(primitive→semantic→utility) + **다크모드**(`@variant` + MMKV)
- **i18n** (i18next, 단일언어는 그대로 통과)
- **환경 전환** — `defineEnv` (env-candidates → env.ts), 시크릿은 `.env` 분리
- **앱 셸** — providers 역할 분리(감싸기/띄우기) + **Suspensive** ErrorBoundary
- **데이터 레이어** — Axios + TanStack Query + 명시적 auth + MMKV token
- **부팅 파이프라인** — splash 뒤 프리로더(강제 업데이트 · OTA(hot-updater) · 권한 슬롯) + 콜드 딥링크 큐 + 프리페치 ([`docs/boot.md`](./docs/boot.md))
- **푸시 알림** — FCM(RNFB 26) + notify-kit FCM Mode, 알림 탭 → 딥링크 큐, 토큰 동기화 어댑터, 알림 권한. `firebase/`에 설정 파일을 넣으면 활성 ([`docs/push.md`](./docs/push.md))
- **단방향 import** ESLint (폴더 지우면 그걸로 끝)

## Quick start

```bash
pnpm install    # .env 가 없으면 .env.example 에서 자동 생성 (빌드 시크릿 전용)
pnpm ios        # 또는: pnpm android  — dev client 빌드 + 실행
pnpm start      # dev 서버 (dev client)
```

> NativeTabs 등 네이티브 모듈을 쓰므로 Expo Go가 아닌 **dev client**가 필요합니다.

## Verify

```bash
CI=true pnpm run check-all
pnpm doctor
```

## Structure

```
src/
  app/          라우팅 전용 (한 줄 재export → features)
  features/     화면 실체 (라우트와 1:1)
  providers/    루트 조립 (app-providers 감싸기 / global-overlays 띄우기)
  components/ui 디자인시스템 (배럴 진입점)
  styles/       토큰 3계층
  api/          도메인별 requests·queries·mutations·types
  lib/          인프라 (api·auth·preloader·ota·deep-link·push·i18n·storage·theme)
  stores/       클라이언트 상태 (auth·overlay)
```

설계 결정과 근거는 [`docs/decisions.md`](./docs/decisions.md), 데이터 레이어 규칙은
[`docs/data-layer.md`](./docs/data-layer.md) 참고.
