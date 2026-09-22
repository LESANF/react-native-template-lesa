import { useEffect } from 'react';
import { AppState, Keyboard } from 'react-native';

/** iOS 는 백그라운드 전환 때 키보드만 내리고 포커스를 남긴다 — 복귀 후 입력을 눌러도 키보드가 안 뜬다.
 * `Keyboard.dismiss()` 여야 한다. keyboard-controller 의 `dismiss()` 는 한 프레임 늦어 효과가 없다. */
export function useDismissKeyboardOnBackground() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') Keyboard.dismiss();
    });

    return () => subscription.remove();
  }, []);
}
