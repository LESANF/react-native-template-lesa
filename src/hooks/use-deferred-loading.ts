import { useEffect, useState } from 'react';

export const DEFAULT_DEFERRED_LOADING_DELAY_MS = 300;

export function useDeferredLoading(
  isLoading: boolean,
  hasData = false,
  delayMs = DEFAULT_DEFERRED_LOADING_DELAY_MS
): boolean {
  const shouldShowLoading = isLoading && !hasData;
  const [isDelayed, setIsDelayed] = useState(false);

  // 렌더 중 리셋(React "adjusting state"). effect 안의 setState 는 lint 가 막는다.
  const [prevInputs, setPrevInputs] = useState({ delayMs, shouldShowLoading });
  if (prevInputs.shouldShowLoading !== shouldShowLoading || prevInputs.delayMs !== delayMs) {
    setPrevInputs({ delayMs, shouldShowLoading });
    setIsDelayed(false);
  }

  useEffect(() => {
    if (!shouldShowLoading || delayMs <= 0) return;

    const timeoutId = setTimeout(() => setIsDelayed(true), delayMs);
    return () => clearTimeout(timeoutId);
  }, [shouldShowLoading, delayMs]);

  return shouldShowLoading && (delayMs <= 0 || isDelayed);
}
