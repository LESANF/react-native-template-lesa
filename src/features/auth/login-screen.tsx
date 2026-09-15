import { router } from 'expo-router';

import { Button, InsetView, ScreenSystemBars, Text, View } from '@/components/ui';
import { pendingDeepLinkIntent } from '@/lib/deep-link/pending-intent';
import { useAuthStore } from '@/stores/auth-store';

/**
 * 자리표시 로그인 화면. auth 게이트(`AUTH_LOGIN_PATH`)가 여기로 보낸다 —
 * 이 라우트가 없으면 게이트를 켠 딥링크가 `+not-found` 로 떨어진다.
 *
 * TODO(앱): 실제 로그인 UI 로 교체한다. 계약은 하나뿐이다 —
 * 성공하면 `useAuthStore.signIn(tokens)` 를 부른다. 그러면 `AuthDeferredRunner` 가
 * 보류된 딥링크를 이어서 재생한다.
 */
export function LoginScreen() {
  const signIn = useAuthStore(state => state.signIn);

  const cancel = () => {
    pendingDeepLinkIntent.clear();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <InsetView className="flex-1 gap-4 bg-background p-4">
      <ScreenSystemBars />
      <Text variant="heading-lg">로그인</Text>
      <Text color="muted">
        자리표시 화면입니다. 실제 로그인 UI 로 교체하고, 성공하면 `signIn(tokens)` 를 부르세요 —
        보류된 딥링크가 이어서 재생됩니다.
      </Text>

      {__DEV__ ? (
        <Button
          onPress={() => signIn({ accessToken: 'dev-access-token', refreshToken: 'dev-refresh' })}>
          개발용 로그인 (dev 빌드에서만 보입니다)
        </Button>
      ) : null}

      <View className="flex-1 justify-end">
        <Button variant="secondary" onPress={cancel}>
          돌아가기
        </Button>
      </View>
    </InsetView>
  );
}
