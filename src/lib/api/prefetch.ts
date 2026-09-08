import { useExampleTodoQuery } from '@/api/example/queries';

import { queryClient } from './query-client';

/**
 * splash 선행 prefetch. fire-and-forget — 실패는 구독 훅이 재시도.
 * TODO(앱): 첫 화면이 쓰는 쿼리로 교체.
 */
export function prefetchOnSplash(): void {
  void queryClient.prefetchQuery(useExampleTodoQuery.getFetchOptions({ id: 1 }));
}

// `enabled` 는 훅 전용 — prefetch 에선 무시된다. 인증 쿼리는 직접 분기.
