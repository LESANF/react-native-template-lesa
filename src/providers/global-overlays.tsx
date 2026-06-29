import { StyleSheet, View } from 'react-native';

import { GlobalToast } from '@/components/ui';

export function GlobalOverlays() {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <GlobalToast />
    </View>
  );
}
