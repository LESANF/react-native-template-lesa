import { useDeepLink } from '@/hooks/use-deep-link';

/**
 * Deep link 배선을 살려두는 headless 러너. UI 가 없다.
 *
 * AppProviders(=QueryProvider) 안쪽에 mount 해야 한다 — useDeepLink 가 useQueryClient 를 쓴다.
 * _layout 본문에서 useDeepLink 를 직접 부르면 context 밖이라 throw.
 */
export function DeepLinkRunner() {
  useDeepLink();
  return null;
}
