import type { OtaUpdateChoice } from '@/lib/preloader/types';
import * as SplashScreen from 'expo-splash-screen';

import { Env } from '@env';
import { popup } from '@/stores/overlay';

// 2버튼 팝업. 좌: 다음에 하기, 우: 업데이트. X 버튼 없음.
export async function showOtaUpdatePopup(): Promise<OtaUpdateChoice> {
  // 네이티브 스플래시가 팝업을 가리지 않도록 먼저 해제
  await SplashScreen.hideAsync().catch(() => undefined);

  // popup.confirm 은 한 번만 resolve 한다 — KR 의 `fired` 가드가 구조적으로 보장된다.
  // TODO(앱): 팝업 카피를 브랜드 톤으로 교체한다.
  const choice = await popup.confirm({
    title: '업데이트 안내',
    message: `새로운 기능 추가와 최적의 이용 환경을 위해 ${Env.identity.name} 앱을 최신 버전으로 업데이트해주세요.`,
    confirmText: '업데이트',
    cancelText: '다음에 하기',
  });

  return choice === 'confirm' ? 'now' : 'later';
}
