import { useExampleTodoQuery } from '@/api/example/queries';

import { queryClient } from './query-client';

/**
 * Splash 단계 선행 prefetch.
 * 홈 첫 프레임 이전에 확보해야 하는 데이터:
 * - 첫 화면 데이터 (cold-start 시 즉시 마운트되므로 Suspense bounce/race 방지)
 * fire-and-forget: 실패해도 각 구독 훅이 홈 진입 시 재시도.
 *
 * TODO(앱): 첫 화면이 실제로 쓰는 쿼리로 교체.
 */
export function prefetchOnSplash(): void {
  void queryClient.prefetchQuery(useExampleTodoQuery.getFetchOptions({ id: 1 }));
}

// TODO(앱): Tabs 레이아웃 마운트 시의 2차 prefetch 웨이브(KR `usePrefetchQueries`)가 필요하면
// 여기에 훅으로 추가한다 — 홈 진입 직후 탭 lazy mount 시 캐시 히트용.
// 주의: react-query `enabled` 는 훅 전용이라 prefetch 에선 무시된다 — 인증 필요 쿼리는
// `status === 'signedIn'` 분기 또는 fetcher 의 skip 옵션으로 막는다.
