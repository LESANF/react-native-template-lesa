import { StyleSheet, View } from 'react-native';

import { GlobalPopup, GlobalToast, NetLogFab } from '@/components/ui';

export function GlobalOverlays() {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* 순서 = z-order. 토스트는 팝업 위에 뜨도록 뒤에 둔다. */}
      <GlobalPopup />
      <GlobalToast />
      {/* 개발 도구 — production 번들에서는 __DEV__ 상수 폴딩으로 사라진다. */}
      {__DEV__ && <NetLogFab />}
    </View>
  );
}
