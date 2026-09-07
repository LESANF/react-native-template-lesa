import { useAuthStore } from '@/stores/auth-store';

/**
 * 앱 전역 상태 초기화.
 * - auth: app/_layout 모듈 스코프의 hydrateAuth()가 import 시점에 복원 (딥링크/푸시 대응).
 *   여기선 현재 상태를 로그로만 확인.
 * - 다른 store 초기화가 필요해지면 여기에 추가.
 */
export async function hydrateAppState(): Promise<void> {
  const { status } = useAuthStore.getState();
  console.log(`[Preloader/hydrate] auth already restored. status=${status}`);
}
