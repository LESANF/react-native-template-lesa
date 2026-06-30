import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

let didSetupReactQueryNativeListeners = false;

function resolveOnlineState(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function setupReactQueryNativeListeners() {
  if (didSetupReactQueryNativeListeners) return;
  didSetupReactQueryNativeListeners = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(resolveOnlineState(state));
    }),
  );

  if (Platform.OS === 'web') return;

  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (status) => {
      handleFocus(status === 'active');
    });

    return () => subscription.remove();
  });
}
