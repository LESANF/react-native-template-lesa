import { useAuthStore } from '@/stores/auth-store';

/** auth 는 `app/_layout` 모듈 스코프에서 이미 복원된다. 다른 store 는 여기에 추가. */
export async function hydrateAppState(): Promise<void> {
  const { status } = useAuthStore.getState();
  console.log(`[Preloader/hydrate] auth already restored. status=${status}`);
}
