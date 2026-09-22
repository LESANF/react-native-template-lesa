import { useEffect } from 'react';
import { AppState, Keyboard } from 'react-native';

/** iOS 는 백그라운드 전환 때 포커스를 남겨 복귀 후 키보드가 안 뜬다. keyboard-controller 의 dismiss() 는 한 프레임 늦다. */
export function useDismissKeyboardOnBackground() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') Keyboard.dismiss();
    });

    return () => subscription.remove();
  }, []);
}
