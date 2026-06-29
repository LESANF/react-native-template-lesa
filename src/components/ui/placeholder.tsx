import { View } from 'react-native';

import { Text } from './text';

export function Placeholder({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="heading-lg">{title}</Text>
    </View>
  );
}
