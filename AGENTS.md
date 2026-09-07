# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# 데이터 레이어

client · auth · store · react-query를 건드리기 전에 [docs/data-layer.md](docs/data-layer.md)를 읽어라. 설계 결정과 그 이유, 프로젝트가 채우는 곳(`TODO(앱)`)이 정리돼 있다.

# 부팅 파이프라인

splash · preloader · OTA(hot-updater) · 딥링크를 건드리기 전에 [docs/boot.md](docs/boot.md)를 읽어라. 두 참조 앱(KR/JP)에서 이식한 결정과 거부된 대안이 정리돼 있다.

# 푸시 알림

FCM(RNFB) · notify-kit · 알림 탭→딥링크 · 토큰 동기화 · 권한을 건드리기 전에 [docs/push.md](docs/push.md)를 읽어라. 활성화는 `firebase/` 설정 파일 존재로 갈리고, 헤드리스 진입(`index.js`)은 스토어를 import하면 안 된다.
