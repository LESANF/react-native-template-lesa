import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

export function usePreventBack(): void {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerLeft: () => null,
        gestureEnabled: false,
      });
      navigation.getParent()?.setOptions({ gestureEnabled: false });

      const hardwareBackPressHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

      return () => {
        navigation.getParent()?.setOptions({ gestureEnabled: true });
        navigation.setOptions({ gestureEnabled: true });
        hardwareBackPressHandler.remove();
      };
    }, [navigation]),
  );
}
