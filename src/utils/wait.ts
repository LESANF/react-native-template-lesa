export const DEFAULT_WAIT_MS = 1000;

export function wait(ms = DEFAULT_WAIT_MS): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
