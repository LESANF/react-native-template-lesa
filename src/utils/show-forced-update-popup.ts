import type { ForcedUpdateChoice } from '@/lib/preloader/types';
import * as SplashScreen from 'expo-splash-screen';

import { Linking } from 'react-native';

import { Env } from '@env';
import { popup, type PopupOptions } from '@/stores/overlay';

// TODO(앱): 팝업 카피를 브랜드 톤으로 교체한다.
const FORCED_UPDATE_POPUP: PopupOptions = {
  title: '업데이트 안내',
  message: `새로운 기능 추가와 최적의 이용 환경을 위해 ${Env.identity.name} 앱을 최신 버전으로 업데이트해주세요.`,
  confirmText: '업데이트',
  // null = 단일 버튼, dismissible false = dimmed 탭/뒤로가기로 닫히지 않음.
  cancelText: null,
  dismissible: false,
  blur: true,
};

// 강제 업데이트 팝업. 닫기 불가 + '업데이트' 단일 버튼.
// 버튼 탭 시 스토어 이동 + Promise resolve → 호출부에서 스플래시 유지로 앱 차단.
export async function showForcedUpdatePopup(storeUrl: string): Promise<ForcedUpdateChoice> {
  // 네이티브 스플래시가 팝업을 가리지 않도록 먼저 해제
  await SplashScreen.hideAsync().catch(() => undefined);

  return new Promise<ForcedUpdateChoice>(resolve => {
    let fired = false;

    // 팝업은 계속 살아 있어야 한다(스토어에서 돌아와도 앱 화면이 드러나면 안 됨).
    // 다른 팝업에 밀려 'cancel'로 닫혀도 다시 띄운다 — sticky 루프.
    void (async () => {
      for (;;) {
        const choice = await popup.confirm(FORCED_UPDATE_POPUP);
        if (choice !== 'confirm') continue;

        void Linking.openURL(storeUrl);
        if (fired) continue;
        fired = true;
        resolve('update');
      }
    })();
  });
}
