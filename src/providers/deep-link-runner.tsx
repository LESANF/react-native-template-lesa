import { useDeepLink } from '@/hooks/use-deep-link';

/** headless 러너. **QueryProvider 안쪽**에 둔다 — _layout 본문에서 부르면 context 밖이라 throw. */
export function DeepLinkRunner() {
  useDeepLink();
  return null;
}
