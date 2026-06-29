import { useEffect, useState } from 'react';

export const DEFAULT_DEFERRED_LOADING_DELAY_MS = 300;

export function useDeferredLoading(
  isLoading: boolean,
  hasData = false,
  delayMs = DEFAULT_DEFERRED_LOADING_DELAY_MS,
): boolean {
  const shouldShowLoading = isLoading && !hasData;
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    if (!shouldShowLoading) {
      setIsDelayed(false);
      return;
    }

    if (delayMs <= 0) {
      setIsDelayed(true);
      return;
    }

    setIsDelayed(false);
    const timeoutId = setTimeout(() => setIsDelayed(true), delayMs);
    return () => clearTimeout(timeoutId);
  }, [shouldShowLoading, delayMs]);

  return shouldShowLoading && (delayMs <= 0 || isDelayed);
}
