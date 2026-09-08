import { useExampleTodoQuery } from '@/api/example/queries';

import { queryClient } from './query-client';

/**
 * splash 단계 선행 prefetch. fire-and-forget — 실패해도 구독 훅이 재시도한다.
 * TODO(앱): 첫 화면이 실제로 쓰는 쿼리로 교체.
 */
export function prefetchOnSplash(): void {
  void queryClient.prefetchQuery(useExampleTodoQuery.getFetchOptions({ id: 1 }));
}

// 주의: react-query `enabled` 는 훅 전용이라 prefetch 에선 무시된다 — 인증 필요 쿼리는
// `status === 'signedIn'` 분기나 fetcher 의 skip 으로 막는다.
