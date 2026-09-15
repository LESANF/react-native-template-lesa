/**
 * 푸시 payload → 딥링크 url. 여기가 null 을 돌려주면 **알림을 눌러도 아무 일이 없다** —
 * 백그라운드·앱 종료 상태라 로그도 못 보고, 사용자는 "알림이 안 먹는다" 고만 말한다.
 */
import { PUSH_DEEP_LINK_DATA_KEYS } from '@/constants/push';
import { extractFromNotifeeDetail, extractFromRemoteMessage } from '@/lib/deep-link/extractors';

const [primary, ...alternates] = PUSH_DEEP_LINK_DATA_KEYS;

describe('extractFromRemoteMessage', () => {
  it('계약 키에서 url 을 꺼낸다', () => {
    for (const key of PUSH_DEEP_LINK_DATA_KEYS) {
      expect(extractFromRemoteMessage({ data: { [key]: 'app://x/1' } })).toBe('app://x/1');
    }
  });

  it('여러 키가 오면 앞선 키가 이긴다 — 서버가 둘 다 보내도 결과가 흔들리지 않게', () => {
    const data = Object.fromEntries(
      PUSH_DEEP_LINK_DATA_KEYS.map((key, index) => [key, `app://k${index}`])
    );
    expect(extractFromRemoteMessage({ data })).toBe('app://k0');
  });

  it('앞선 키가 빈 문자열이면 다음 키로 넘어간다', () => {
    // 계약 키는 현재 3개다. 하나로 줄이면 이 검사는 의미가 없어진다.
    expect(alternates.length).toBeGreaterThan(0);
    expect(
      extractFromRemoteMessage({ data: { [primary]: '', [alternates[0]]: 'app://fallback' } })
    ).toBe('app://fallback');
  });

  it('문자열이 아닌 값은 무시한다 — notifee data 는 객체가 올 수 있다', () => {
    for (const value of [{ url: 'app://x' }, 42, true, null, undefined, ['app://x']]) {
      expect(extractFromRemoteMessage({ data: { [primary]: value } })).toBeNull();
    }
  });

  it('data 가 없거나 비면 null', () => {
    expect(extractFromRemoteMessage({})).toBeNull();
    expect(extractFromRemoteMessage({ data: {} })).toBeNull();
    expect(extractFromRemoteMessage({ data: null })).toBeNull();
    expect(extractFromRemoteMessage({ data: undefined })).toBeNull();
  });

  it('계약에 없는 키는 무시한다 — 서버가 키를 바꾸면 조용히 멈춘다는 뜻이다', () => {
    expect(extractFromRemoteMessage({ data: { url: 'app://x/1' } })).toBeNull();
  });
});

describe('extractFromNotifeeDetail', () => {
  it('notification.data 에서 꺼낸다', () => {
    expect(extractFromNotifeeDetail({ notification: { data: { [primary]: 'app://x/1' } } })).toBe(
      'app://x/1'
    );
  });

  it('notification 이 없으면 null — 빈 detail 로 크래시하지 않는다', () => {
    expect(extractFromNotifeeDetail({})).toBeNull();
    expect(extractFromNotifeeDetail({ notification: {} })).toBeNull();
    expect(extractFromNotifeeDetail(undefined as never)).toBeNull();
  });
});
