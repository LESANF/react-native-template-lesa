# firebase/ — 푸시 활성화 스위치

환경별 Firebase 설정 파일을 여기 둔다(`<env>` = `development` | `preview` | `production`).

- `GoogleService-Info.<env>.plist` (iOS) · `google-services.<env>.json` (Android)
- **한 환경에 두 파일이 다 있어야** 그 환경의 푸시가 켜진다. 하나만 있으면 `STRICT_ENV_VALIDATION=1` 에서 throw, 평소엔 warn.
- 이 파일들은 **커밋한다** — Firebase 클라이언트 설정은 공개 값이지 시크릿이 아니다(참조 앱 KR/JP와 같은 운용).
- 커밋을 원치 않는 팀: `.gitignore` 에 `firebase/*.plist` · `firebase/google-services.*.json` 을 넣고 EAS **file 타입 환경 변수**로 같은 경로에 복원한다(빌드에 파일이 없으면 푸시가 조용히 꺼진다).
- iOS 는 Firebase 콘솔에 **APNs 인증 키(.p8)** 를 업로드해야 실제 발송이 된다.
- 푸시가 켜지면 prebuild 가 iOS NSE 타깃 `NotifyKitNSE` 를 생성한다(notify-kit 플러그인).
