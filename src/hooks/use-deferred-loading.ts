import { useEffect, useState } from 'react';

export const DEFAULT_DEFERRED_LOADING_DELAY_MS = 300;

export function useDeferredLoading(
  isLoading: boolean,
  hasData = false,
  delayMs = DEFAULT_DEFERRED_LOADING_DELAY_MS,
): boolean {
  const shouldShowLoading = isLoading && !hasData;
  const [isDelayed, setIsDelayed] = useState(false);

  // 입력이 바뀌면 렌더 중에 즉시 리셋한다(React 공식 "adjusting state" 패턴).
  // 효과 안의 동기 setState는 연쇄 렌더를 만들어 lint(set-state-in-effect)가 막는다.
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
