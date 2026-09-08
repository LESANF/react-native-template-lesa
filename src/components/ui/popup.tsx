import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { popup, useOverlayStore } from '@/stores/overlay';

import { Button } from './button';
import { Dimmed } from './dimmed';
import { Text } from './text';

export { popup };
export type { PopupChoice, PopupOptions } from '@/stores/overlay';

// 전역 확인 팝업 호스트. 결과는 store 의 resolve 로 호출부 Promise 에 전달된다.
export function GlobalPopup() {
  const current = useOverlayStore(state => state.popup);

  useEffect(() => {
    if (!current) return;

    // 열린 동안 Android 뒤로가기를 소비한다. dismissible 이면 취소로 닫는다.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (current.dismissible) popup.close('cancel', current.id);
      return true;
    });

    return () => subscription.remove();
  }, [current]);

  if (!current) return null;

  const { id, title, message, confirmText, cancelText, dismissible, blur } = current;
  const isStringMessage = typeof message === 'string' || typeof message === 'number';
  // Dimmed 의 blur 는 판별 유니언이라 boolean 을 바로 못 넘긴다.
  const dimmedVisual = blur ? ({ blur: true } as const) : ({ blur: false } as const);

  return (
    <Dimmed
      {...dimmedVisual}
      accessibilityLabel="팝업 닫기"
      onPress={dismissible ? () => popup.close('cancel', id) : undefined}>
      <Animated.View
        key={id}
        accessibilityRole="alert"
        entering={FadeIn.duration(120)}
        exiting={FadeOut.duration(80)}
        className="mx-8 gap-4 self-stretch rounded-3xl border border-border bg-card p-5 shadow-md">
        {title ? <Text variant="heading-sm">{title}</Text> : null}
        {isStringMessage ? <Text color="muted">{message}</Text> : <View>{message}</View>}

        <View className="flex-row gap-2">
          {cancelText !== null && (
            <View className="flex-1">
              <Button variant="secondary" onPress={() => popup.close('cancel', id)}>
                {cancelText}
              </Button>
            </View>
          )}
          <View className="flex-1">
            <Button onPress={() => popup.close('confirm', id)}>{confirmText}</Button>
          </View>
        </View>
      </Animated.View>
    </Dimmed>
  );
}
