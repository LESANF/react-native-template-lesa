const DEFAULT_DURATION = 500;

export function throttle<Args extends readonly unknown[]>(
  fn: ((...args: Args) => void) | null | undefined,
  duration = DEFAULT_DURATION
): (...args: Args) => void {
  let last = 0;

  return (...args: Args) => {
    if (!fn) return;
    const now = Date.now();
    if (now - last < duration) return;
    last = now;
    fn(...args);
  };
}
