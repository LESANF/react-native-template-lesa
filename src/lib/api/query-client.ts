import { QueryClient } from '@tanstack/react-query';

import { API_ERROR_CODES, ApiError } from './api-error';

const QUERY_RETRY_LIMIT = 2;
const QUERY_STALE_TIME_MS = 30 * 1000;
const QUERY_GC_TIME_MS = 5 * 60 * 1000;

// 네트워크·타임아웃·5xx 만 재시도. TODO(앱): 429·408 이 필요하면 추가.
function shouldRetryQuery(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.code === API_ERROR_CODES.canceled) return false;
  if (error.isNetworkError) return true; // network + timeout 둘 다 isNetworkError=true
  return error.status !== undefined && error.status >= 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: QUERY_GC_TIME_MS,
        retry: (failureCount, error) => failureCount < QUERY_RETRY_LIMIT && shouldRetryQuery(error),
        staleTime: QUERY_STALE_TIME_MS,
        throwOnError: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
