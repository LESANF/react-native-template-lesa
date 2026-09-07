/** 푸시 정책 상수 — 채널 식별자와 서버 페이로드 계약. 흩어지면 첫 푸시가 엉뚱한 채널로 간다. */

/** `firebase.json` 의 messaging_android_notification_channel_id 와 같은 값이어야 한다. */
export const PUSH_CHANNEL_ID = 'high-priority';

/** Android 설정 화면에 노출된다. TODO(앱): 사용자에게 보일 문구로. */
export const PUSH_CHANNEL_NAME = 'High Priority Notifications';

/** 포그라운드 배너 표시 — 앱 정책. 백그라운드/종료는 OS 가 그리므로 무관. KR 은 끈다. */
export const SHOW_FOREGROUND_NOTIFICATION = true;

/** data 에서 딥링크를 찾을 키 — 앞에서부터 첫 non-empty 가 이긴다. TODO(앱): 서버 계약대로 줄인다. */
export const PUSH_DEEP_LINK_DATA_KEYS = ['deep_link', 'deepLink', 'link'] as const;
