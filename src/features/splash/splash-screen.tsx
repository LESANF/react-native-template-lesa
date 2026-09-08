import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { ActivityIndicator, Image, Text, View } from '@/components/ui';
import { SPLASH_HANDOFF_DELAY_MS } from '@/constants/deep-link';
import { deepLinkDispatcher } from '@/lib/deep-link/dispatcher';
import { useSplashInitializer } from '@/lib/preloader/splash-initializer';
import { startPushTokenSync } from '@/lib/push/token-sync';
import { wait } from '@/utils/wait';

import { useSplashIntro } from './intro-gate';

// app.config 의 expo-splash-screen backgroundColor 와 **같아야** 이음새가 없다.
// TODO(앱): 브랜드 배경색·로고로 교체(두 곳을 함께).
const SPLASH_BACKGROUND_COLOR = '#208AEF';
const SPLASH_LOGO_SIZE = 76;

export function SplashScreen() {
  const { isInitialized, isOtaPending, failures, stage, current, total } = useSplashInitializer();
  const intro = useSplashIntro();
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  const goToTabs = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (deepLinkDispatcher.hasQueue()) {
      // 이 분기가 없으면 미등록 링크에서 dispatcher 가 noop 하고 splash 에 갇힌다.
      const safeFallback = deepLinkDispatcher.peekSafeFallback();
      if (safeFallback) {
        router.replace(safeFallback as Href);
        void wait(SPLASH_HANDOFF_DELAY_MS).then(() => deepLinkDispatcher.notifySplashClosed());
        return;
      }

      deepLinkDispatcher.notifySplashClosed();
      return;
    }

    router.replace('/(tabs)');
    // dispatcher drain 과 router.replace 충돌 방지
    void wait(SPLASH_HANDOFF_DELAY_MS).then(() => deepLinkDispatcher.notifySplashClosed());
  }, [router]);

  const failureCount = failures.length;

  useEffect(() => {
    if (!isInitialized) return;

    // 권한 스테이지 뒤에 시작한다 — 다이얼로그 전에 토큰을 받으러 가면 iOS 에서 경합한다.
    startPushTokenSync();

    // 성공 경로는 reload 로 재시작되므로 여기는 실패 경로에서만 도달한다.
    if (isOtaPending) {
      goToTabs();
      return;
    }

    if (failureCount > 0) {
      console.warn('[Splash] Failures:', failures);
    }

    // 반환값이 cleanup — unmount 되면 이동하지 않는다.
    return intro.start(goToTabs);
    // failures 는 매 업데이트마다 새 참조라 deps 제외 — 변경 신호는 length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isOtaPending, failureCount, goToTabs, intro]);

  // OTA 다운로드 중. 성공하면 reload 로 이 화면째 사라진다.
  if (isOtaPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#141414" />
      </View>
    );
  }

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: SPLASH_BACKGROUND_COLOR }}>
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={{ width: SPLASH_LOGO_SIZE, height: SPLASH_LOGO_SIZE }}
        contentFit="contain"
      />
      {intro.node}
      {/* dev 전용: 네이티브 splash 와 JS splash 가 똑같이 보여서, 어느 층에서 멈췄는지 구분하려면 표식이 필요하다. */}
      {__DEV__ ? (
        <Text className="mt-4 text-white">
          {isInitialized ? 'js splash · initialized' : `js splash · ${stage} ${current}/${total}`}
        </Text>
      ) : null}
    </View>
  );
}
