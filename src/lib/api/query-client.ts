import { QueryClient } from '@tanstack/react-query';

import { isRetryableApiError } from './api-error';

const QUERY_RETRY_LIMIT = 2;
const QUERY_STALE_TIME_MS = 30 * 1000;
const QUERY_GC_TIME_MS = 5 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_GC_TIME_MS,
      retry: (failureCount, error) =>
        failureCount < QUERY_RETRY_LIMIT && isRetryableApiError(error),
      staleTime: QUERY_STALE_TIME_MS,
      throwOnError: false,
    },
  },
});
