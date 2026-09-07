# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# 섹션별 문서 — 건드리기 전에 읽어라

수정할 폴더로 문서를 찾는다. 각 문서는 **파일 지도 · 확정 결정 · 거부된 대안 · 채우는 곳(`TODO(앱)`) · 검증 상태** 순서다.

| 건드리는 곳                                                                                 | 읽을 문서                                |
| ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `lib/api` · `lib/auth` · `api/` · `stores/auth-store`                                       | [docs/data-layer.md](docs/data-layer.md) |
| `app/splash` · `features/splash` · `lib/preloader` · `lib/deep-link` · OTA · 어트리뷰션 SDK | [docs/boot.md](docs/boot.md)             |
| `lib/push` · `index.js` · `firebase/` · `constants/push`                                    | [docs/push.md](docs/push.md)             |
| `app/` · `features/` · `providers/` · `constants/tabs` · 탭 · 모달                          | [docs/routing.md](docs/routing.md)       |
| `components/ui` · `styles/` · 토큰 · 다크모드 · 배럴                                        | [docs/ui.md](docs/ui.md)                 |
| `env-candidates.ts` · `env.ts` · `.env` · `app.config.ts` · `plugins/` · 빌드 스크립트      | [docs/config.md](docs/config.md)         |

- [docs/decisions.md](docs/decisions.md) — 날짜별 결정 색인(본문은 위 섹션 문서에 있다)
- [docs/template-completion.md](docs/template-completion.md) — 진행 상황과 남은 작업
- [docs/handoff.md](docs/handoff.md) — 세션 인수인계

# 반드시 지킬 것

- **거부된 대안을 다시 제안하지 마라.** 각 섹션 문서에 절이 있다.
- 참조 앱(KR/JP) 소스가 로컬에 있다 — 추측하지 말고 대조한다. 경로는 `docs/handoff.md`.
- `ios/`·`android/`는 산출물이다. 네이티브 변경은 `plugins/`의 config plugin 또는 로컬 Expo Module로 한다.
- 헤드리스 진입(`index.js` → `lib/push/background`)은 React·화면을 import 하면 안 된다.
- 코드 주석은 1~3줄. 배경과 근거는 docs에 둔다.
