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

// app.config의 expo-splash-screen backgroundColor와 같아야 네이티브 → JS 전환에 이음새가 없다.
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
      // 게이트가 있는 라우트의 safeFallbackExpoPath 가 있으면 그 위에 게이트 UI 가 뜨도록 먼저 그 화면으로.
      // 미등록 링크면 홈으로 — 이 분기가 없으면 dispatcher 가 noop 하고 splash 에 갇힌다 (KR 그대로).
      const safeFallback = deepLinkDispatcher.peekSafeFallback();
      if (safeFallback) {
        router.replace(safeFallback as Href);
        void wait(SPLASH_HANDOFF_DELAY_MS).then(() => deepLinkDispatcher.notifySplashClosed());
        return;
      }

      // 등록 라우트 + fallback 미지정: dispatcher 가 handler.navigate 로 reset/replace 위임.
      deepLinkDispatcher.notifySplashClosed();
      return;
    }

    // 일반 cold: 기본 (tabs) 로.
    router.replace('/(tabs)');
    // dispatcher drain 과 router.replace 충돌 방지
    void wait(SPLASH_HANDOFF_DELAY_MS).then(() => deepLinkDispatcher.notifySplashClosed());
  }, [router]);

  const failureCount = failures.length;

  useEffect(() => {
    if (!isInitialized) return;

    // 권한 스테이지 뒤에 시작한다 — 권한 다이얼로그 전에 토큰을 받으러 가면 iOS 에서 경합한다
    // (참조 앱 결함 D1 수정). 앱 수명 싱글턴이라 cleanup 은 없다(splash 는 곧 unmount).
    startPushTokenSync();

    // OTA 업데이트를 시도한 경우 바로 탭 이동.
    // 성공 경로는 reload로 앱이 재시작되므로 이 라인은 실패 경로에서만 도달.
    if (isOtaPending) {
      goToTabs();
      return;
    }

    if (failureCount > 0) {
      console.warn('[Splash] Failures:', failures);
    }

    // 인트로 게이트(KR 은 영상 재생 종료) 가 끝나면 이동. 반환값이 cleanup — unmount 되면 이동하지 않는다.
    return intro.start(goToTabs);
    // failures 배열은 매 업데이트마다 새 참조라 deps 제외. 실제 변경 신호는 length로 판단.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isOtaPending, failureCount, goToTabs, intro]);

  // OTA 다운로드 중 — 흰 배경 + 인디케이터. 성공하면 reload로 이 화면째로 사라진다.
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
