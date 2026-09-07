/**
 * 푸시 정책 상수 — 채널 식별자와 서버 페이로드 계약을 한 곳에 모은다.
 *
 * 참조 앱(KR/JP)은 같은 채널 문자열이 코드 3곳에 흩어져 있었다(결함 D13). 여기 하나만 둔다.
 */

/**
 * Android 알림 채널 ID.
 * `firebase.json` 의 `react-native.messaging_android_notification_channel_id` 와 **같은 값이어야 한다**
 * — FCM SDK 가 직접 그리는 알림(우리 코드를 거치지 않는 경로)이 같은 채널로 떨어져야 중요도가 일치한다.
 */
export const PUSH_CHANNEL_ID = 'high-priority';

/** Android 설정 화면에 노출되는 채널 이름. TODO(앱): 사용자에게 보일 문구로 교체. */
export const PUSH_CHANNEL_NAME = 'High Priority Notifications';

/**
 * 알림 payload 의 `data` 에서 딥링크 URL 을 찾을 키 — **앞에서부터 첫 번째 비어있지 않은 문자열이 이긴다**.
 * 참조 앱 서버가 실제로 보내는 키들이다(KR/JP 혼재). TODO(앱): 서버 계약이 하나면 줄여도 된다.
 */
export const PUSH_DEEP_LINK_DATA_KEYS = ['deep_link', 'deepLink', 'link'] as const;
